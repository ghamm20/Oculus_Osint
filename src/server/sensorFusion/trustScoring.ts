import type { EvidenceEntity, ProviderHealthState } from "./streamSchema";
import { clamp01 } from "./freshness";

const OFFICIAL_PROVIDERS = new Set([
    "fl511-public",
    "faa-weather-cameras",
    "earthquake",
    "wildfire",
    "aviation",
    "camera",
]);

export function providerBaseTrust(provider: string, legalStatus: string): number {
    if (legalStatus === "blocked") return 0;
    if (legalStatus === "api_required") return 0.35;
    if (provider === "argos-demo") return 0.55;
    if (provider === "user-streams") return 0.62;
    if (OFFICIAL_PROVIDERS.has(provider)) return 0.9;
    return 0.68;
}

export function trustScore(entity: Pick<EvidenceEntity, "provider" | "legal_status" | "lat" | "lon" | "freshness_score" | "confidence">, providerHealth: ProviderHealthState = "healthy"): number {
    let score = providerBaseTrust(entity.provider, entity.legal_status);
    score *= clamp01(entity.confidence || 0.5);
    score *= 0.6 + entity.freshness_score * 0.4;
    if (entity.lat === null || entity.lon === null) score -= 0.15;
    if (providerHealth === "degraded") score -= 0.1;
    if (providerHealth === "unavailable" || providerHealth === "zero_entities") score -= 0.25;
    if (providerHealth === "blocked") score = 0;
    return Number(clamp01(score).toFixed(3));
}
