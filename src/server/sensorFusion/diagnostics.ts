import type { EvidenceEntity, EvidenceSeverity, SensorEvent } from "./streamSchema";

export function nowIso(): string {
    return new Date().toISOString();
}

export function makeId(prefix: string): string {
    return `${prefix}:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
}

export function locationLabel(entity: Pick<EvidenceEntity, "lat" | "lon" | "raw">): string | null {
    const city = typeof entity.raw.city === "string" ? entity.raw.city : null;
    const state = typeof entity.raw.state === "string" ? entity.raw.state : null;
    const country = typeof entity.raw.country === "string" ? entity.raw.country : null;
    const named = [city, state, country].filter(Boolean).join(", ");
    if (named) return named;
    if (entity.lat !== null && entity.lon !== null) return `${entity.lat.toFixed(3)}, ${entity.lon.toFixed(3)}`;
    return null;
}

export function eventFromEntity(type: SensorEvent["type"], entity: EvidenceEntity, summary: string, severity: EvidenceSeverity = entity.severity ?? "info"): SensorEvent {
    return {
        id: makeId(type),
        type,
        entity_id: entity.id,
        provider: entity.provider,
        severity,
        confidence: entity.confidence,
        title: entity.title,
        summary,
        location: locationLabel(entity),
        created_at: nowIso(),
        payload: { entity },
    };
}

export function staleWarning(staleCount: number): string | null {
    if (staleCount <= 0) return null;
    return `${staleCount.toLocaleString()} sensor entities are stale or past expected refresh. Treat conclusions as degraded until sources recover.`;
}
