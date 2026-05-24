export type EvidenceSourceType =
    | "webcam"
    | "traffic_camera"
    | "audio"
    | "ais"
    | "adsb"
    | "weather"
    | "wildfire"
    | "earthquake"
    | "rf_presence"
    | "generic_stream"
    | "manual"
    | "blocked";

export type EvidenceSeverity = "info" | "low" | "medium" | "high" | "critical";
export type EvidenceLegalStatus = "approved" | "user_added" | "api_required" | "blocked" | "unknown";
export type ProviderHealthState = "healthy" | "degraded" | "unavailable" | "api_required" | "blocked" | "zero_entities";
export type SensorEventType =
    | "entity_created"
    | "entity_updated"
    | "entity_stale"
    | "entity_removed"
    | "provider_health_changed"
    | "anomaly_created"
    | "brief_updated"
    | "correlation_created"
    | "source_failed"
    | "source_recovered";

export interface EvidenceEntity {
    id: string;
    source_id: string;
    provider: string;
    source_type: EvidenceSourceType;
    title: string;
    description: string | null;
    lat: number | null;
    lon: number | null;
    alt: number | null;
    heading: number | null;
    speed: number | null;
    status: string | null;
    severity: EvidenceSeverity | null;
    confidence: number;
    trust_score: number;
    freshness_score: number;
    last_seen: string;
    first_seen: string;
    updated_at: string;
    expires_at: string | null;
    source_page_url: string | null;
    live_url: string | null;
    embed_url: string | null;
    thumbnail_url: string | null;
    requires_user_click: boolean;
    legal_status: EvidenceLegalStatus;
    tags: string[];
    raw: Record<string, unknown>;
    diagnostics: Record<string, unknown>;
    future_evidence?: {
        device_hash: string | null;
        sensor_id: string;
        rssi: number | null;
        confidence_radius_m: number | null;
        dwell_seconds: number | null;
        movement_vector: Record<string, unknown> | null;
        privacy_mode: boolean;
    };
}

export interface SensorProviderHealth {
    provider_id: string;
    display_name: string;
    source_type: EvidenceSourceType;
    health: ProviderHealthState;
    requires_api_key: boolean;
    terms_url: string;
    last_refresh: string | null;
    next_refresh: string | null;
    entity_count: number;
    stale_count: number;
    refresh_interval_seconds: number;
    error_state: string | null;
    message: string;
    diagnostics: Record<string, unknown>;
}

export interface RateLimitPolicy {
    min_refresh_seconds: number;
    burst?: number;
    notes?: string;
}

export interface FailurePolicy {
    mark_stale_after_failures: number;
    backoff_multiplier: number;
    max_backoff_seconds: number;
}

export interface SensorProvider {
    provider_id: string;
    display_name: string;
    source_type: EvidenceSourceType;
    requires_api_key: boolean;
    terms_url: string;
    min_refresh_seconds: number;
    rate_limit_policy: RateLimitPolicy;
    failure_policy: FailurePolicy;
    fetch_catalog(): Promise<EvidenceEntity[]>;
    fetch_updates(since_timestamp: string | null): Promise<EvidenceEntity[]>;
    normalize_item(raw: unknown): EvidenceEntity | null;
    get_live_url(item_id: string): Promise<{
        live_url: string | null;
        embed_url: string | null;
        source_page_url: string | null;
        requires_user_click: boolean;
        legal_status: EvidenceLegalStatus;
        diagnostics: Record<string, unknown>;
    }>;
    healthcheck(): Promise<SensorProviderHealth>;
}

export interface SensorEvent {
    id: string;
    type: SensorEventType;
    entity_id?: string;
    provider?: string;
    severity: EvidenceSeverity;
    confidence: number;
    title: string;
    summary: string;
    location: string | null;
    created_at: string;
    payload: Record<string, unknown>;
}

export interface CorrelationObject {
    id: string;
    title: string;
    summary: string;
    entities: string[];
    bbox: { min_lat: number; min_lon: number; max_lat: number; max_lon: number } | null;
    time_start: string;
    time_end: string;
    confidence: number;
    severity: EvidenceSeverity;
    reasoning_summary: string;
    recommended_action: string;
    created_at: string;
}

export interface AnomalyObject {
    id: string;
    title: string;
    summary: string;
    entities: string[];
    provider: string | null;
    severity: EvidenceSeverity;
    confidence: number;
    rule_id: string;
    heuristic: true;
    created_at: string;
    diagnostics: Record<string, unknown>;
}

export interface OperatorBrief {
    generated_at: string;
    mode: string;
    top_items: Array<{
        title: string;
        summary: string;
        why_it_matters: string;
        confidence: number;
        severity: EvidenceSeverity;
        supporting_entities: string[];
        recommended_action: string;
    }>;
    source_health_summary: Record<string, unknown>;
    stale_data_warning: string | null;
}

export interface ReplayUpdate {
    id: string;
    entity_id: string;
    provider: string;
    type: SensorEventType;
    recorded_at: string;
    entity: EvidenceEntity | null;
    event: SensorEvent;
}
