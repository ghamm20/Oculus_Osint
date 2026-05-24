import type { CorrelationObject, EvidenceEntity, EvidenceSeverity } from "./streamSchema";
import { makeId, nowIso } from "./diagnostics";
import { severityRank } from "./entityStore";

const EARTH_RADIUS_M = 6_371_000;

function toRad(value: number): number {
    return value * Math.PI / 180;
}

function distanceMeters(a: EvidenceEntity, b: EvidenceEntity): number {
    if (a.lat === null || a.lon === null || b.lat === null || b.lon === null) return Number.POSITIVE_INFINITY;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
    return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

function maxSeverity(entities: EvidenceEntity[]): EvidenceSeverity {
    return entities.reduce<EvidenceSeverity>((best, entity) => {
        const next = entity.severity ?? "info";
        return severityRank(next) > severityRank(best) ? next : best;
    }, "info");
}

function bbox(entities: EvidenceEntity[]): CorrelationObject["bbox"] {
    const points = entities.filter((entity) => entity.lat !== null && entity.lon !== null);
    if (!points.length) return null;
    return {
        min_lat: Math.min(...points.map((entity) => entity.lat as number)),
        min_lon: Math.min(...points.map((entity) => entity.lon as number)),
        max_lat: Math.max(...points.map((entity) => entity.lat as number)),
        max_lon: Math.max(...points.map((entity) => entity.lon as number)),
    };
}

function sharedTags(a: EvidenceEntity, b: EvidenceEntity): number {
    const tags = new Set(a.tags);
    return b.tags.filter((tag) => tags.has(tag)).length;
}

export function correlateEntities(entities: EvidenceEntity[], options: { distanceMeters?: number; windowSeconds?: number } = {}): CorrelationObject[] {
    const maxDistance = options.distanceMeters ?? 30_000;
    const windowSeconds = options.windowSeconds ?? 15 * 60;
    const active = entities
        .filter((entity) => entity.lat !== null && entity.lon !== null && entity.legal_status !== "blocked")
        .sort((a, b) => Date.parse(b.last_seen) - Date.parse(a.last_seen))
        .slice(0, 1200);
    const visited = new Set<string>();
    const correlations: CorrelationObject[] = [];

    for (const seed of active) {
        if (visited.has(seed.id)) continue;
        const seedTime = Date.parse(seed.last_seen);
        const group = active.filter((candidate) => {
            if (candidate.id === seed.id) return true;
            const candidateTime = Date.parse(candidate.last_seen);
            const timeClose = Number.isFinite(seedTime)
                && Number.isFinite(candidateTime)
                && Math.abs(candidateTime - seedTime) <= windowSeconds * 1000;
            if (!timeClose) return false;
            const distanceClose = distanceMeters(seed, candidate) <= maxDistance;
            const tagClose = sharedTags(seed, candidate) > 0 && distanceMeters(seed, candidate) <= maxDistance * 2;
            const typeDiverse = seed.source_type !== candidate.source_type && distanceMeters(seed, candidate) <= maxDistance * 1.5;
            return distanceClose || tagClose || typeDiverse;
        });
        if (group.length < 2) continue;
        for (const entity of group) visited.add(entity.id);

        const confidence = Math.min(0.95, group.reduce((sum, entity) => sum + entity.confidence, 0) / group.length + Math.min(group.length, 6) * 0.03);
        const types = Array.from(new Set(group.map((entity) => entity.source_type))).join(", ");
        const severity = maxSeverity(group);
        const timeValues = group.map((entity) => Date.parse(entity.last_seen)).filter(Number.isFinite);
        correlations.push({
            id: makeId("correlation"),
            title: `${group.length} related ${types} observations`,
            summary: `${group.length} observations align by time, location, source type, or tags.`,
            entities: group.map((entity) => entity.id),
            bbox: bbox(group),
            time_start: new Date(Math.min(...timeValues)).toISOString(),
            time_end: new Date(Math.max(...timeValues)).toISOString(),
            confidence: Number(confidence.toFixed(3)),
            severity,
            reasoning_summary: "Heuristic correlation: distance, time window, source-type diversity, shared tags, and provider confidence.",
            recommended_action: severityRank(severity) >= 3
                ? "Inspect supporting entities and confirm with official/source-page context."
                : "Monitor for additional source confirmation or changing severity.",
            created_at: nowIso(),
        });
        if (correlations.length >= 40) break;
    }

    return correlations;
}
