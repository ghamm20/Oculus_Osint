import { fetchLiveSourceCatalog, findLiveSourceItem } from "@/server/liveSources/catalog";
import { getProvider, liveSourceProviders } from "@/server/liveSources/providers";
import { registerStream } from "@/server/liveSources/streamRegistry";
import { validateStream } from "@/server/liveSources/streamValidator";
import type { ArgosEntity, ProviderHealth as LiveProviderHealth } from "@/server/liveSources/types";
import { freshnessScore } from "./freshness";
import { providerBaseTrust, trustScore } from "./trustScoring";
import type {
    EvidenceEntity,
    EvidenceLegalStatus,
    EvidenceSeverity,
    EvidenceSourceType,
    FailurePolicy,
    RateLimitPolicy,
    SensorProvider,
    SensorProviderHealth,
} from "./streamSchema";

const REFRESH_INTERVALS: Record<string, number> = {
    "argos-demo": 10,
    "user-streams": 15,
    "fl511-public": 60,
    "faa-weather-cameras": 120,
    "openwebcamdb": 21_600,
    earthcam: 21_600,
    outdooractive: 21_600,
    skyline: 21_600,
    flfirefighters: 60,
    broadcastify: 300,
    "marinecadastre-ais": 300,
    "blocked-insecam": 86_400,
};

const DEFAULT_FAILURE_POLICY: FailurePolicy = {
    mark_stale_after_failures: 2,
    backoff_multiplier: 2,
    max_backoff_seconds: 300,
};

function mapSourceType(type: string): EvidenceSourceType {
    if (type === "traffic_camera") return "traffic_camera";
    if (type === "audio") return "audio";
    if (type === "ais") return "ais";
    if (type === "blocked") return "blocked";
    if (type === "webcam") return "webcam";
    return "generic_stream";
}

function mapLegalStatus(status: string): EvidenceLegalStatus {
    if (status === "approved" || status === "api_required" || status === "blocked" || status === "unknown") return status;
    if (status === "user_added") return "user_added";
    return "unknown";
}

function inferSeverity(item: ArgosEntity): EvidenceSeverity {
    if (item.legal_status === "blocked") return "low";
    if (item.type === "audio") return item.legal_status === "api_required" ? "low" : "medium";
    if (item.type === "ais") return "low";
    if (item.provider === "argos-demo") return "low";
    return "info";
}

function addSeconds(iso: string, seconds: number): string {
    const time = Date.parse(iso);
    return new Date((Number.isFinite(time) ? time : Date.now()) + seconds * 1000).toISOString();
}

export function normalizeLiveSourceItem(item: ArgosEntity, refreshSeconds: number, providerHealth: SensorProviderHealth["health"] = "healthy"): EvidenceEntity {
    const lastSeen = item.last_checked || new Date().toISOString();
    const freshness = freshnessScore(lastSeen, refreshSeconds);
    const legalStatus = mapLegalStatus(item.legal_status);
    const confidence = item.provider === "argos-demo" ? 0.58 : item.legal_status === "approved" ? 0.85 : item.legal_status === "blocked" ? 0.3 : 0.55;
    const base: EvidenceEntity = {
        id: item.id,
        source_id: item.id,
        provider: item.provider,
        source_type: mapSourceType(item.type),
        title: item.title,
        description: item.description,
        lat: item.lat,
        lon: item.lon,
        alt: null,
        heading: null,
        speed: null,
        status: freshness < 0.2 ? "stale" : "active",
        severity: inferSeverity(item),
        confidence,
        trust_score: providerBaseTrust(item.provider, legalStatus),
        freshness_score: freshness,
        last_seen: lastSeen,
        first_seen: lastSeen,
        updated_at: new Date().toISOString(),
        expires_at: addSeconds(lastSeen, refreshSeconds * 3),
        source_page_url: item.source_page_url,
        live_url: item.live_url,
        embed_url: item.embed_url,
        thumbnail_url: item.thumbnail_url,
        requires_user_click: item.requires_user_click,
        legal_status: legalStatus,
        tags: [
            item.type,
            item.provider,
            item.state,
            item.country,
            item.diagnostics?.sample ? "demo" : null,
        ].filter((value): value is string => typeof value === "string" && value.length > 0),
        raw: {
            city: item.city,
            state: item.state,
            country: item.country,
            source_page_url: item.source_page_url,
            source_type: item.type,
        },
        diagnostics: item.diagnostics ?? {},
    };

    return {
        ...base,
        trust_score: trustScore(base, providerHealth),
    };
}

function healthFromLiveProvider(liveHealth: LiveProviderHealth, refreshSeconds: number): SensorProviderHealth {
    const state = liveHealth.status === "degraded" && liveHealth.item_count === 0 ? "zero_entities" : liveHealth.status;
    const now = new Date().toISOString();
    return {
        provider_id: liveHealth.provider_id,
        display_name: liveHealth.display_name,
        source_type: mapSourceType(liveHealth.source_type),
        health: state,
        requires_api_key: liveHealth.requires_api_key,
        terms_url: liveHealth.terms_url,
        last_refresh: liveHealth.checked_at ?? now,
        next_refresh: addSeconds(liveHealth.checked_at ?? now, refreshSeconds),
        entity_count: liveHealth.item_count ?? 0,
        stale_count: 0,
        refresh_interval_seconds: refreshSeconds,
        error_state: state === "healthy" ? null : liveHealth.message,
        message: liveHealth.message,
        diagnostics: liveHealth.diagnostics ?? {},
    };
}

class LiveSourceSensorProvider implements SensorProvider {
    provider_id: string;
    display_name: string;
    source_type: EvidenceSourceType;
    requires_api_key: boolean;
    terms_url: string;
    min_refresh_seconds: number;
    rate_limit_policy: RateLimitPolicy;
    failure_policy = DEFAULT_FAILURE_POLICY;

    constructor(private liveProviderId: string) {
        const live = liveSourceProviders.find((provider) => provider.provider_id === liveProviderId);
        if (!live) throw new Error(`Unknown live source provider ${liveProviderId}`);
        this.provider_id = live.provider_id;
        this.display_name = live.display_name;
        this.source_type = mapSourceType(live.source_type);
        this.requires_api_key = live.requires_api_key;
        this.terms_url = live.terms_url;
        this.min_refresh_seconds = REFRESH_INTERVALS[live.provider_id] ?? Math.max(30, live.cache_ttl_seconds ?? 300);
        this.rate_limit_policy = {
            min_refresh_seconds: this.min_refresh_seconds,
            notes: live.cache_ttl_seconds ? `Catalog cache TTL ${live.cache_ttl_seconds}s` : undefined,
        };
    }

    async fetch_catalog(): Promise<EvidenceEntity[]> {
        const liveHealth = await this.healthcheck();
        const { items } = await fetchLiveSourceCatalog({
            provider: this.liveProviderId,
            includeSamples: this.liveProviderId === "argos-demo",
            limit: 10_000,
        });
        return items.map((item) => normalizeLiveSourceItem(item, this.min_refresh_seconds, liveHealth.health));
    }

    async fetch_updates(_since_timestamp: string | null): Promise<EvidenceEntity[]> {
        return this.fetch_catalog();
    }

    normalize_item(raw: unknown): EvidenceEntity | null {
        if (!raw || typeof raw !== "object") return null;
        return normalizeLiveSourceItem(raw as ArgosEntity, this.min_refresh_seconds);
    }

    async get_live_url(item_id: string) {
        const provider = getProvider(this.liveProviderId);
        if (provider) {
            const live = await provider.get_live_url(item_id);
            return {
                live_url: live.live_url,
                embed_url: live.embed_url,
                source_page_url: live.source_page_url,
                requires_user_click: live.requires_user_click,
                legal_status: mapLegalStatus(live.legal_status),
                diagnostics: live.diagnostics,
            };
        }
        const item = await findLiveSourceItem(item_id);
        return {
            live_url: item?.live_url ?? null,
            embed_url: item?.embed_url ?? null,
            source_page_url: item?.source_page_url ?? null,
            requires_user_click: item?.requires_user_click ?? true,
            legal_status: mapLegalStatus(item?.legal_status ?? "unknown"),
            diagnostics: item?.diagnostics ?? { reason: "item_not_found" },
        };
    }

    async healthcheck(): Promise<SensorProviderHealth> {
        const provider = getProvider(this.liveProviderId);
        if (!provider) {
            return {
                provider_id: this.provider_id,
                display_name: this.display_name,
                source_type: this.source_type,
                health: "unavailable",
                requires_api_key: this.requires_api_key,
                terms_url: this.terms_url,
                last_refresh: new Date().toISOString(),
                next_refresh: null,
                entity_count: 0,
                stale_count: 0,
                refresh_interval_seconds: this.min_refresh_seconds,
                error_state: "Provider not registered",
                message: "Provider not registered",
                diagnostics: {},
            };
        }
        return healthFromLiveProvider(await provider.healthcheck(), this.min_refresh_seconds);
    }
}

const sensorProviders = liveSourceProviders.map((provider) => new LiveSourceSensorProvider(provider.provider_id));

export function listSensorProviders(): SensorProvider[] {
    return sensorProviders;
}

export function getSensorProvider(providerId: string): SensorProvider | undefined {
    return sensorProviders.find((provider) => provider.provider_id === providerId);
}

export async function addUserStreamToSensors(input: {
    source_url: string;
    title?: string;
    lat?: number | null;
    lon?: number | null;
    tags?: string[];
}) {
    return registerStream(input);
}

export { validateStream };
