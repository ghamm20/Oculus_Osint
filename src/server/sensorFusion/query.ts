import type { EvidenceEntity, EvidenceSeverity, EvidenceSourceType } from "./streamSchema";

export function parseBbox(raw: string | null): [number, number, number, number] | undefined {
    if (!raw) return undefined;
    const parts = raw.split(",").map((part) => Number(part.trim()));
    if (parts.length !== 4 || parts.some((part) => !Number.isFinite(part))) return undefined;
    const [minLon, minLat, maxLon, maxLat] = parts;
    if (minLon >= maxLon || minLat >= maxLat) return undefined;
    return [minLon, minLat, maxLon, maxLat];
}

export function filterEntities(entities: EvidenceEntity[], params: {
    type?: string | null;
    provider?: string | null;
    bbox?: [number, number, number, number];
    q?: string | null;
    freshness?: string | null;
    severity?: string | null;
    limit?: number;
}): EvidenceEntity[] {
    const types = params.type?.split(",").map((value) => value.trim()).filter(Boolean) as EvidenceSourceType[] | undefined;
    const severities = params.severity?.split(",").map((value) => value.trim()).filter(Boolean) as EvidenceSeverity[] | undefined;
    const providers = params.provider?.split(",").map((value) => value.trim()).filter(Boolean);
    const q = params.q?.trim().toLowerCase();
    const limit = Math.max(1, Math.min(params.limit ?? 10_000, 25_000));
    return entities.filter((entity) => {
        if (types?.length && !types.includes(entity.source_type)) return false;
        if (providers?.length && !providers.includes(entity.provider)) return false;
        if (severities?.length && !severities.includes(entity.severity ?? "info")) return false;
        if (params.freshness === "stale" && entity.status !== "stale") return false;
        if (params.freshness === "fresh" && entity.freshness_score < 0.66) return false;
        if (params.bbox && entity.lat !== null && entity.lon !== null) {
            const [minLon, minLat, maxLon, maxLat] = params.bbox;
            if (entity.lon < minLon || entity.lon > maxLon || entity.lat < minLat || entity.lat > maxLat) return false;
        }
        if (q) {
            const haystack = [
                entity.title,
                entity.description,
                entity.provider,
                entity.source_type,
                entity.status,
                entity.severity,
                ...entity.tags,
                entity.raw.city,
                entity.raw.state,
                entity.raw.country,
            ].filter(Boolean).join(" ").toLowerCase();
            if (!haystack.includes(q)) return false;
        }
        return true;
    }).slice(0, limit);
}
