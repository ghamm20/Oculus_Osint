import type {
    EvidenceEntity,
    EvidenceSeverity,
    SensorEvent,
    SensorProviderHealth,
} from "./streamSchema";
import { eventFromEntity, makeId, nowIso } from "./diagnostics";
import { isStale } from "./freshness";
import { replayStore } from "./replayStore";

export interface UpsertResult {
    events: SensorEvent[];
    created: number;
    updated: number;
    unchanged: number;
}

function materialHash(entity: EvidenceEntity): string {
    return JSON.stringify({
        last_seen: entity.last_seen,
        status: entity.status,
        severity: entity.severity,
        lat: entity.lat,
        lon: entity.lon,
        heading: entity.heading,
        speed: entity.speed,
        freshness_score: entity.freshness_score,
        trust_score: entity.trust_score,
    });
}

export class EntityStore {
    private entities = new Map<string, EvidenceEntity>();
    private hashes = new Map<string, string>();
    private providerHealth = new Map<string, SensorProviderHealth>();
    private events: SensorEvent[] = [];

    upsertMany(nextEntities: EvidenceEntity[]): UpsertResult {
        const events: SensorEvent[] = [];
        let created = 0;
        let updated = 0;
        let unchanged = 0;

        for (const entity of nextEntities) {
            const existing = this.entities.get(entity.id);
            const first_seen = existing?.first_seen ?? entity.first_seen ?? entity.last_seen ?? nowIso();
            const normalized: EvidenceEntity = {
                ...entity,
                first_seen,
                updated_at: nowIso(),
            };
            const hash = materialHash(normalized);
            const previousHash = this.hashes.get(entity.id);
            this.entities.set(entity.id, normalized);
            this.hashes.set(entity.id, hash);

            if (!existing) {
                created += 1;
                events.push(eventFromEntity("entity_created", normalized, `New ${normalized.source_type} evidence from ${normalized.provider}.`, normalized.severity ?? "info"));
            } else if (hash !== previousHash) {
                updated += 1;
                events.push(eventFromEntity("entity_updated", normalized, `${normalized.title} updated.`, normalized.severity ?? "info"));
            } else {
                unchanged += 1;
            }
        }

        this.appendEvents(events);
        return { events, created, updated, unchanged };
    }

    markStale(now = new Date()): SensorEvent[] {
        const events: SensorEvent[] = [];
        for (const entity of this.entities.values()) {
            const alreadyStale = entity.status === "stale";
            if (isStale(entity, now) && !alreadyStale) {
                const staleEntity: EvidenceEntity = {
                    ...entity,
                    status: "stale",
                    updated_at: now.toISOString(),
                    diagnostics: { ...entity.diagnostics, stale: true },
                };
                this.entities.set(entity.id, staleEntity);
                events.push(eventFromEntity("entity_stale", staleEntity, `${staleEntity.title} is stale.`, "low"));
            }
        }
        this.appendEvents(events);
        return events;
    }

    removeMissingProviderEntities(provider: string, seenIds: Set<string>): SensorEvent[] {
        const events: SensorEvent[] = [];
        for (const entity of this.entities.values()) {
            if (entity.provider !== provider || seenIds.has(entity.id)) continue;
            this.entities.delete(entity.id);
            this.hashes.delete(entity.id);
            events.push({
                id: makeId("entity_removed"),
                type: "entity_removed",
                entity_id: entity.id,
                provider,
                severity: "info",
                confidence: entity.confidence,
                title: entity.title,
                summary: `${entity.title} left the active sensor set.`,
                location: null,
                created_at: nowIso(),
                payload: { entity },
            });
        }
        this.appendEvents(events);
        return events;
    }

    setProviderHealth(health: SensorProviderHealth): SensorEvent | null {
        const existing = this.providerHealth.get(health.provider_id);
        this.providerHealth.set(health.provider_id, health);
        if (existing?.health === health.health && existing?.entity_count === health.entity_count && existing?.error_state === health.error_state) {
            return null;
        }
        const event: SensorEvent = {
            id: makeId("provider_health_changed"),
            type: "provider_health_changed",
            provider: health.provider_id,
            severity: health.health === "healthy" ? "info" : health.health === "blocked" ? "low" : "medium",
            confidence: 1,
            title: health.display_name,
            summary: `${health.display_name}: ${health.health.replace("_", " ")}.`,
            location: null,
            created_at: nowIso(),
            payload: { health },
        };
        this.appendEvents([event]);
        return event;
    }

    getEntities(): EvidenceEntity[] {
        return Array.from(this.entities.values());
    }

    getEntity(id: string): EvidenceEntity | undefined {
        return this.entities.get(id);
    }

    getProviderHealth(): SensorProviderHealth[] {
        return Array.from(this.providerHealth.values());
    }

    getEvents(limit = 200): SensorEvent[] {
        return this.events.slice(-limit).reverse();
    }

    getChanges(since?: string | null): SensorEvent[] {
        if (!since) return this.getEvents(500);
        const sinceMs = Date.parse(since);
        if (!Number.isFinite(sinceMs)) return this.getEvents(500);
        return this.events.filter((event) => Date.parse(event.created_at) > sinceMs).reverse();
    }

    recordEvents(events: SensorEvent[]): void {
        this.appendEvents(events);
    }

    countByProvider(provider: string): number {
        let count = 0;
        for (const entity of this.entities.values()) {
            if (entity.provider === provider) count += 1;
        }
        return count;
    }

    staleCountByProvider(provider: string): number {
        let count = 0;
        for (const entity of this.entities.values()) {
            if (entity.provider === provider && entity.status === "stale") count += 1;
        }
        return count;
    }

    private appendEvents(events: SensorEvent[]): void {
        if (!events.length) return;
        this.events.push(...events);
        this.events = this.events.slice(-5000);
        for (const event of events) {
            replayStore.record(event, event.entity_id ? this.entities.get(event.entity_id) ?? null : null);
        }
    }
}

export const entityStore = new EntityStore();

export function severityRank(severity: EvidenceSeverity | null | undefined): number {
    if (severity === "critical") return 5;
    if (severity === "high") return 4;
    if (severity === "medium") return 3;
    if (severity === "low") return 2;
    return 1;
}
