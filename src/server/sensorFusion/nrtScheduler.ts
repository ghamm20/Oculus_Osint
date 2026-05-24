import { detectAnomalies } from "./anomalyEngine";
import { correlateEntities } from "./correlationEngine";
import { entityStore } from "./entityStore";
import { sensorEventBus } from "./eventBus";
import { buildOperatorBrief } from "./intelligenceCompressor";
import { buildNarrative } from "./narrativeEngine";
import { listSensorProviders } from "./providerRegistry";
import type {
    AnomalyObject,
    CorrelationObject,
    EvidenceEntity,
    EvidenceSeverity,
    OperatorBrief,
    SensorEvent,
    SensorProvider,
    SensorProviderHealth,
} from "./streamSchema";
import { makeId, nowIso } from "./diagnostics";

interface ProviderState {
    lastRun: number;
    lastSuccess: string | null;
    failures: number;
    running: boolean;
}

export class NrtScheduler {
    private providers = listSensorProviders();
    private state = new Map<string, ProviderState>();
    private timer: ReturnType<typeof setInterval> | null = null;
    private correlationTimer: ReturnType<typeof setInterval> | null = null;
    private correlations: CorrelationObject[] = [];
    private anomalies: AnomalyObject[] = [];
    private brief: OperatorBrief = buildOperatorBrief({
        mode: "global-awareness",
        entities: [],
        correlations: [],
        anomalies: [],
        providerHealth: [],
    });
    private narrative = buildNarrative({ events: [], correlations: [], brief: this.brief });

    start(): void {
        if (this.timer) return;
        for (const provider of this.providers) {
            if (!this.state.has(provider.provider_id)) {
                this.state.set(provider.provider_id, { lastRun: 0, lastSuccess: null, failures: 0, running: false });
            }
        }
        void this.tick(true);
        this.timer = setInterval(() => { void this.tick(false); }, 1000);
        this.correlationTimer = setInterval(() => this.runAnalysisPass("global-awareness"), 15_000);
    }

    stop(): void {
        if (this.timer) clearInterval(this.timer);
        if (this.correlationTimer) clearInterval(this.correlationTimer);
        this.timer = null;
        this.correlationTimer = null;
    }

    async refreshAll(force = true): Promise<{ events: SensorEvent[]; entities: EvidenceEntity[]; provider_health: SensorProviderHealth[] }> {
        const events: SensorEvent[] = [];
        for (const provider of this.providers) {
            events.push(...await this.refreshProvider(provider, force));
        }
        events.push(...entityStore.markStale());
        this.runAnalysisPass("global-awareness");
        return {
            events,
            entities: entityStore.getEntities(),
            provider_health: entityStore.getProviderHealth(),
        };
    }

    async refreshProvider(provider: SensorProvider, force = false): Promise<SensorEvent[]> {
        const state = this.state.get(provider.provider_id) ?? { lastRun: 0, lastSuccess: null, failures: 0, running: false };
        const dueMs = provider.min_refresh_seconds * 1000 * Math.min(
            provider.failure_policy.max_backoff_seconds / provider.min_refresh_seconds,
            Math.max(1, provider.failure_policy.backoff_multiplier ** state.failures),
        );
        if (!force && state.running) return [];
        if (!force && Date.now() - state.lastRun < dueMs) return [];

        state.running = true;
        state.lastRun = Date.now();
        this.state.set(provider.provider_id, state);
        const events: SensorEvent[] = [];

        try {
            const health = await provider.healthcheck();
            const healthEvent = entityStore.setProviderHealth({
                ...health,
                stale_count: entityStore.staleCountByProvider(provider.provider_id),
            });
            if (healthEvent) events.push(healthEvent);

            if (health.health === "api_required" || health.health === "blocked") {
                state.failures = 0;
                state.lastSuccess = nowIso();
                return this.publish(events);
            }

            const entities = await provider.fetch_updates(state.lastSuccess);
            const seenIds = new Set(entities.map((entity) => entity.id));
            const upsert = entityStore.upsertMany(entities);
            events.push(...upsert.events);
            events.push(...entityStore.removeMissingProviderEntities(provider.provider_id, seenIds));
            const countHealth = entityStore.setProviderHealth({
                ...health,
                health: entities.length === 0 && health.health === "healthy" ? "zero_entities" : health.health,
                entity_count: entities.length,
                stale_count: entityStore.staleCountByProvider(provider.provider_id),
                last_refresh: nowIso(),
                next_refresh: new Date(Date.now() + provider.min_refresh_seconds * 1000).toISOString(),
                error_state: entities.length === 0 && health.health === "healthy" ? "Provider returned zero entities" : health.error_state,
            });
            if (countHealth) events.push(countHealth);
            state.failures = 0;
            state.lastSuccess = nowIso();
        } catch (err: any) {
            state.failures += 1;
            const event: SensorEvent = {
                id: makeId("source_failed"),
                type: "source_failed",
                provider: provider.provider_id,
                severity: state.failures >= provider.failure_policy.mark_stale_after_failures ? "medium" : "low",
                confidence: 1,
                title: provider.display_name,
                summary: err?.message ?? String(err),
                location: null,
                created_at: nowIso(),
                payload: { failures: state.failures },
            };
            events.push(event);
            entityStore.recordEvents([event]);
        } finally {
            state.running = false;
            this.state.set(provider.provider_id, state);
        }

        return this.publish(events);
    }

    getEntities(): EvidenceEntity[] {
        return entityStore.getEntities();
    }

    getEntity(id: string): EvidenceEntity | undefined {
        return entityStore.getEntity(id);
    }

    getHealth(): SensorProviderHealth[] {
        return entityStore.getProviderHealth();
    }

    getEvents(limit = 200): SensorEvent[] {
        return entityStore.getEvents(limit);
    }

    getChanges(since?: string | null): SensorEvent[] {
        return entityStore.getChanges(since);
    }

    getCorrelations(): CorrelationObject[] {
        if (!this.correlations.length && entityStore.getEntities().length > 1) {
            this.runAnalysisPass(this.brief.mode);
        }
        return this.correlations;
    }

    getAnomalies(): AnomalyObject[] {
        if (!this.anomalies.length && entityStore.getEntities().length > 1) {
            this.runAnalysisPass(this.brief.mode);
        }
        return this.anomalies;
    }

    getBrief(mode = "global-awareness"): OperatorBrief {
        this.runAnalysisPass(mode);
        return this.brief;
    }

    getNarrative(since?: string | null, mode = "global-awareness") {
        if (this.brief.mode !== mode) this.runAnalysisPass(mode);
        this.narrative = buildNarrative({
            events: entityStore.getChanges(since),
            correlations: this.correlations,
            brief: this.brief,
            since,
        });
        return this.narrative;
    }

    runAnalysisPass(mode = "global-awareness"): void {
        const entities = entityStore.getEntities();
        const events = entityStore.getEvents(1000).reverse();
        const providerHealth = entityStore.getProviderHealth();
        const correlations = correlateEntities(entities);
        const anomalies = detectAnomalies({ entities, events, providerHealth });
        const previousCorrelationIds = new Set(this.correlations.map((correlation) => correlation.title));
        const previousAnomalyIds = new Set(this.anomalies.map((anomaly) => anomaly.title));
        this.correlations = correlations;
        this.anomalies = anomalies;
        this.brief = buildOperatorBrief({ mode, entities, correlations, anomalies, providerHealth });
        this.narrative = buildNarrative({ events: entityStore.getEvents(100), correlations, brief: this.brief });

        const emitted: SensorEvent[] = [];
        for (const correlation of correlations) {
            if (previousCorrelationIds.has(correlation.title)) continue;
            emitted.push({
                id: makeId("correlation_created"),
                type: "correlation_created",
                severity: correlation.severity,
                confidence: correlation.confidence,
                title: correlation.title,
                summary: correlation.summary,
                location: null,
                created_at: nowIso(),
                payload: { correlation },
            });
        }
        for (const anomaly of anomalies) {
            if (previousAnomalyIds.has(anomaly.title)) continue;
            emitted.push({
                id: makeId("anomaly_created"),
                type: "anomaly_created",
                provider: anomaly.provider ?? undefined,
                severity: anomaly.severity,
                confidence: anomaly.confidence,
                title: anomaly.title,
                summary: anomaly.summary,
                location: null,
                created_at: nowIso(),
                payload: { anomaly },
            });
        }
        emitted.push({
            id: makeId("brief_updated"),
            type: "brief_updated",
            severity: this.brief.top_items[0]?.severity ?? "info",
            confidence: this.brief.top_items[0]?.confidence ?? 0.5,
            title: "Operator brief updated",
            summary: this.brief.top_items[0]?.summary ?? "ARGOS brief updated.",
            location: null,
            created_at: nowIso(),
            payload: { brief: this.brief },
        });
        entityStore.recordEvents(emitted);
        this.publish(emitted);
    }

    private async tick(force: boolean): Promise<void> {
        const due = this.providers.map((provider) => this.refreshProvider(provider, force));
        await Promise.allSettled(due);
        this.publish(entityStore.markStale());
    }

    private publish(events: SensorEvent[]): SensorEvent[] {
        for (const event of events) sensorEventBus.publish(event);
        return events;
    }
}

declare global {
    // eslint-disable-next-line no-var
    var __argosSensorScheduler: NrtScheduler | undefined;
}

export function getSensorScheduler(): NrtScheduler {
    if (!globalThis.__argosSensorScheduler) {
        globalThis.__argosSensorScheduler = new NrtScheduler();
    }
    return globalThis.__argosSensorScheduler;
}
