export type ArgosSourceType = "webcam" | "traffic_camera" | "audio" | "ais" | "blocked";
export type ArgosLegalStatus = "approved" | "api_required" | "blocked" | "unknown";
export type ProviderHealthStatus = "healthy" | "degraded" | "unavailable" | "api_required" | "blocked";
export type StreamProtocol =
    | "rtsp"
    | "rtmp"
    | "hls"
    | "mjpeg"
    | "iframe"
    | "snapshot"
    | "onvif"
    | "webrtc"
    | "youtube"
    | "vlc"
    | "unknown";

export interface ArgosEntity {
    id: string;
    provider: string;
    type: ArgosSourceType;
    title: string;
    description: string | null;
    lat: number | null;
    lon: number | null;
    city: string | null;
    state: string | null;
    country: string | null;
    thumbnail_url: string | null;
    live_url: string | null;
    embed_url: string | null;
    source_page_url: string;
    refresh_seconds: number;
    requires_user_click: boolean;
    legal_status: ArgosLegalStatus;
    last_checked: string;
    diagnostics: Record<string, unknown>;
}

export interface CatalogQuery {
    provider?: string;
    type?: ArgosSourceType[];
    bbox?: [number, number, number, number];
    q?: string;
    limit?: number;
    includeSamples?: boolean;
}

export interface ProviderHealth {
    provider_id: string;
    display_name: string;
    source_type: ArgosSourceType;
    status: ProviderHealthStatus;
    requires_api_key: boolean;
    terms_url: string;
    checked_at: string;
    item_count: number | null;
    message: string;
    diagnostics: Record<string, unknown>;
}

export interface LiveUrlResult {
    live_url: string | null;
    embed_url: string | null;
    source_page_url: string;
    requires_user_click: boolean;
    legal_status: ArgosLegalStatus;
    diagnostics: Record<string, unknown>;
}

export interface LiveSourceProvider {
    provider_id: string;
    display_name: string;
    source_type: ArgosSourceType;
    requires_api_key: boolean;
    terms_url: string;
    cache_ttl_seconds?: number;
    fetch_catalog(query?: CatalogQuery): Promise<ArgosEntity[]>;
    normalize_item(raw: unknown): ArgosEntity | null;
    get_live_url(item_id: string): Promise<LiveUrlResult>;
    healthcheck(): Promise<ProviderHealth>;
}

export interface StreamCapabilities {
    browser_playable: boolean;
    needs_external_player: boolean;
    can_embed: boolean;
    can_snapshot: boolean;
    can_record: boolean;
    can_analyze: boolean;
    low_bandwidth: boolean;
    notes: string[];
}

export interface StreamValidationResult {
    ok: boolean;
    protocol: StreamProtocol;
    source_url: string;
    playable_url: string | null;
    embed_url: string | null;
    thumbnail_url: string | null;
    auth_required: boolean;
    health_status: "online" | "degraded" | "offline" | "auth_failed" | "unsupported_codec" | "stream_timeout" | "cors_blocked" | "geo_unknown";
    refresh_rate: number;
    capabilities_json: StreamCapabilities;
    diagnostics: Record<string, unknown>;
}

export interface RegisteredStream {
    id: string;
    title: string;
    protocol: StreamProtocol;
    source_url: string;
    thumbnail_url: string | null;
    lat: number | null;
    lon: number | null;
    tags: string[];
    provider: string;
    auth_required: boolean;
    refresh_rate: number;
    health_status: StreamValidationResult["health_status"];
    last_seen: string;
    capabilities_json: StreamCapabilities;
}
