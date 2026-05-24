import type { AnomalyObject, CorrelationObject, EvidenceEntity, OperatorBrief, SensorProviderHealth } from "./streamSchema";
import { nowIso, staleWarning } from "./diagnostics";
import { severityRank } from "./entityStore";

const MODE_LANGUAGE: Record<string, string> = {
    "global-awareness": "Maintain broad public-sensor awareness and watch cross-domain changes.",
    "emergency-ops": "Prioritize hazards, outages, public safety, and rapidly changing feeds.",
    maritime: "Prioritize AIS, harbor cameras, weather, and coastal incident overlap.",
    aviation: "Prioritize ADS-B, weather cameras, airport visibility, and route disruptions.",
    weather: "Prioritize weather cameras, weather/radar pathways, and transport impacts.",
    wildfire: "Prioritize wildfire, weather, camera proximity, smoke/fire hooks, and evacuation context.",
    infrastructure: "Prioritize DOT feeds, traffic cameras, outages, and transportation bottlenecks.",
    "property-defense": "Prioritize local camera/stream health, weather, fire, and perimeter placeholders.",
    "rf-sentinel": "RF placeholder mode: show privacy-preserving density, dwell, and sensor health only.",
    "family-safety": "Family-safety placeholder mode: emphasize location-aware alerts without invasive identity tracking.",
};

function healthSummary(providerHealth: SensorProviderHealth[]) {
    return {
        total: providerHealth.length,
        healthy: providerHealth.filter((provider) => provider.health === "healthy").length,
        degraded: providerHealth.filter((provider) => provider.health === "degraded" || provider.health === "zero_entities").length,
        api_required: providerHealth.filter((provider) => provider.health === "api_required").length,
        blocked: providerHealth.filter((provider) => provider.health === "blocked").length,
        unavailable: providerHealth.filter((provider) => provider.health === "unavailable").length,
    };
}

export function buildOperatorBrief(params: {
    mode: string;
    entities: EvidenceEntity[];
    correlations: CorrelationObject[];
    anomalies: AnomalyObject[];
    providerHealth: SensorProviderHealth[];
}): OperatorBrief {
    const staleCount = params.entities.filter((entity) => entity.status === "stale").length;
    const topAnomalies = params.anomalies
        .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.confidence - a.confidence)
        .slice(0, 2);
    const topCorrelations = params.correlations
        .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || b.confidence - a.confidence)
        .slice(0, 2);
    const recentImportant = params.entities
        .filter((entity) => entity.legal_status !== "blocked")
        .sort((a, b) => {
            const scoreA = severityRank(a.severity) * 2 + a.trust_score + a.freshness_score;
            const scoreB = severityRank(b.severity) * 2 + b.trust_score + b.freshness_score;
            return scoreB - scoreA;
        })
        .slice(0, 3);

    const topItems = [
        ...topAnomalies.map((anomaly) => ({
            title: anomaly.title,
            summary: anomaly.summary,
            why_it_matters: "Heuristic anomaly detection suggests source behavior changed from baseline.",
            confidence: anomaly.confidence,
            severity: anomaly.severity,
            supporting_entities: anomaly.entities,
            recommended_action: "Inspect supporting entities and source health before acting.",
        })),
        ...topCorrelations.map((correlation) => ({
            title: correlation.title,
            summary: correlation.summary,
            why_it_matters: correlation.reasoning_summary,
            confidence: correlation.confidence,
            severity: correlation.severity,
            supporting_entities: correlation.entities,
            recommended_action: correlation.recommended_action,
        })),
        ...recentImportant.map((entity) => ({
            title: entity.title,
            summary: `${entity.source_type} from ${entity.provider}; freshness ${(entity.freshness_score * 100).toFixed(0)}%, trust ${(entity.trust_score * 100).toFixed(0)}%.`,
            why_it_matters: MODE_LANGUAGE[params.mode] ?? MODE_LANGUAGE["global-awareness"],
            confidence: entity.confidence,
            severity: entity.severity ?? "info",
            supporting_entities: [entity.id],
            recommended_action: entity.source_page_url ? "Open source page/live view and verify context." : "Monitor for corroborating updates.",
        })),
    ].slice(0, 3);

    while (topItems.length < 3) {
        topItems.push({
            title: "No high-priority change",
            summary: "ARGOS is monitoring NRT feeds; no additional high-confidence item is elevated right now.",
            why_it_matters: "A quiet brief is useful when source health remains visible and stale data is marked.",
            confidence: 0.5,
            severity: "info",
            supporting_entities: [],
            recommended_action: "Keep monitoring provider health and activity feed.",
        });
    }

    return {
        generated_at: nowIso(),
        mode: params.mode,
        top_items: topItems,
        source_health_summary: healthSummary(params.providerHealth),
        stale_data_warning: staleWarning(staleCount),
    };
}
