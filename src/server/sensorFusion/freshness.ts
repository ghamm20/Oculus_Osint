import type { EvidenceEntity } from "./streamSchema";

export function clamp01(value: number): number {
    return Math.max(0, Math.min(1, value));
}

export function freshnessScore(lastSeenIso: string, expectedRefreshSeconds: number, now = new Date()): number {
    const lastSeen = Date.parse(lastSeenIso);
    if (!Number.isFinite(lastSeen)) return 0;
    const ageSeconds = Math.max(0, (now.getTime() - lastSeen) / 1000);
    const staleAt = Math.max(15, expectedRefreshSeconds * 3);
    return clamp01(1 - ageSeconds / staleAt);
}

export function isStale(entity: EvidenceEntity, now = new Date()): boolean {
    if (entity.expires_at) {
        const expires = Date.parse(entity.expires_at);
        if (Number.isFinite(expires)) return now.getTime() > expires;
    }
    return entity.freshness_score < 0.2;
}

export function freshnessLabel(score: number): "fresh" | "aging" | "stale" {
    if (score >= 0.66) return "fresh";
    if (score >= 0.2) return "aging";
    return "stale";
}
