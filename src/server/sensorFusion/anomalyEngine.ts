import type { AnomalyObject, EvidenceEntity, SensorEvent, SensorProviderHealth } from "./streamSchema";
import { makeId, nowIso } from "./diagnostics";

function recent(events: SensorEvent[], minutes: number): SensorEvent[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return events.filter((event) => Date.parse(event.created_at) >= cutoff);
}

export function detectAnomalies(params: {
    entities: EvidenceEntity[];
    events: SensorEvent[];
    providerHealth: SensorProviderHealth[];
}): AnomalyObject[] {
    const anomalies: AnomalyObject[] = [];
    const recentEvents = recent(params.events, 15);
    const createsByProvider = new Map<string, SensorEvent[]>();
    for (const event of recentEvents) {
        if (event.type !== "entity_created" || !event.provider) continue;
        const list = createsByProvider.get(event.provider) ?? [];
        list.push(event);
        createsByProvider.set(event.provider, list);
    }

    for (const [provider, events] of createsByProvider) {
        if (events.length < 25) continue;
        anomalies.push({
            id: makeId("anomaly"),
            title: `Entity count spike from ${provider}`,
            summary: `${events.length} new entities appeared from ${provider} in the last 15 minutes.`,
            entities: events.map((event) => event.entity_id).filter((id): id is string => !!id).slice(0, 50),
            provider,
            severity: events.length > 250 ? "high" : "medium",
            confidence: 0.78,
            rule_id: "entity_count_spike",
            heuristic: true,
            created_at: nowIso(),
            diagnostics: { window_minutes: 15, event_count: events.length },
        });
    }

    for (const health of params.providerHealth) {
        if (health.health === "healthy" || health.health === "api_required" || health.health === "blocked") continue;
        anomalies.push({
            id: makeId("anomaly"),
            title: `${health.display_name} source health degraded`,
            summary: health.error_state ?? health.message,
            entities: params.entities.filter((entity) => entity.provider === health.provider_id).slice(0, 30).map((entity) => entity.id),
            provider: health.provider_id,
            severity: health.health === "unavailable" ? "medium" : "low",
            confidence: 0.82,
            rule_id: "source_health_degraded",
            heuristic: true,
            created_at: nowIso(),
            diagnostics: { health },
        });
    }

    const staleByProvider = new Map<string, EvidenceEntity[]>();
    for (const entity of params.entities) {
        if (entity.status !== "stale") continue;
        const list = staleByProvider.get(entity.provider) ?? [];
        list.push(entity);
        staleByProvider.set(entity.provider, list);
    }
    for (const [provider, stale] of staleByProvider) {
        if (stale.length < 15) continue;
        anomalies.push({
            id: makeId("anomaly"),
            title: `${provider} stale-data cluster`,
            summary: `${stale.length} entities from ${provider} are stale after expected refresh.`,
            entities: stale.slice(0, 50).map((entity) => entity.id),
            provider,
            severity: "medium",
            confidence: 0.7,
            rule_id: "source_silence_after_activity",
            heuristic: true,
            created_at: nowIso(),
            diagnostics: { stale_count: stale.length },
        });
    }

    return anomalies.slice(0, 50);
}
