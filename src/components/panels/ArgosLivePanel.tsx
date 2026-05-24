"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
    Activity,
    AlertTriangle,
    CheckCircle2,
    Clock,
    ExternalLink,
    Eye,
    KeyRound,
    Layers,
    Loader2,
    Play,
    Plus,
    Power,
    Radio,
    RefreshCw,
    ShieldAlert,
    Sparkles,
    Wifi,
} from "lucide-react";

import { pluginManager } from "@/core/plugins/PluginManager";
import { useStore } from "@/core/state/store";
import { trackEvent } from "@/lib/analytics";
import { HlsPlayer } from "@/components/video/HlsPlayer";

type SensorSourceType =
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
type LegalStatus = "approved" | "user_added" | "api_required" | "blocked" | "unknown";
type HealthState = "healthy" | "degraded" | "unavailable" | "api_required" | "blocked" | "zero_entities";
type ViewMode = "globe" | "grid" | "wall" | "focus" | "pip";
type TimeWindow = "5m" | "15m" | "1h" | "6h" | "24h";
type OperatorMode =
    | "global-awareness"
    | "emergency-ops"
    | "maritime"
    | "aviation"
    | "weather"
    | "wildfire"
    | "infrastructure"
    | "property-defense"
    | "rf-sentinel"
    | "family-safety";

interface EvidenceEntity {
    id: string;
    source_id: string;
    provider: string;
    source_type: SensorSourceType;
    title: string;
    description: string | null;
    lat: number | null;
    lon: number | null;
    alt: number | null;
    heading: number | null;
    speed: number | null;
    status: string | null;
    severity: "info" | "low" | "medium" | "high" | "critical" | null;
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
    legal_status: LegalStatus;
    tags: string[];
    raw: Record<string, unknown>;
    diagnostics: Record<string, unknown>;
}

interface ProviderHealth {
    provider_id: string;
    display_name: string;
    source_type: SensorSourceType;
    health: HealthState;
    requires_api_key: boolean;
    terms_url: string;
    last_refresh: string | null;
    next_refresh: string | null;
    entity_count: number;
    stale_count: number;
    refresh_interval_seconds: number;
    error_state: string | null;
    message: string;
}

interface SensorEvent {
    id: string;
    type: string;
    entity_id?: string;
    provider?: string;
    severity: "info" | "low" | "medium" | "high" | "critical";
    confidence: number;
    title: string;
    summary: string;
    location: string | null;
    created_at: string;
    payload: {
        entity?: EvidenceEntity;
        health?: ProviderHealth;
        brief?: OperatorBrief;
        anomaly?: AnomalyObject;
        correlation?: CorrelationObject;
    } & Record<string, unknown>;
}

interface CorrelationObject {
    id: string;
    title: string;
    summary: string;
    entities: string[];
    confidence: number;
    severity: "info" | "low" | "medium" | "high" | "critical";
    reasoning_summary: string;
    recommended_action: string;
    created_at: string;
}

interface AnomalyObject {
    id: string;
    title: string;
    summary: string;
    entities: string[];
    provider: string | null;
    severity: "info" | "low" | "medium" | "high" | "critical";
    confidence: number;
    rule_id: string;
    heuristic: true;
    created_at: string;
}

interface OperatorBrief {
    generated_at: string;
    mode: OperatorMode | string;
    top_items: Array<{
        title: string;
        summary: string;
        why_it_matters: string;
        confidence: number;
        severity: "info" | "low" | "medium" | "high" | "critical";
        supporting_entities: string[];
        recommended_action: string;
    }>;
    source_health_summary: Record<string, unknown>;
    stale_data_warning: string | null;
}

interface StreamValidation {
    ok: boolean;
    protocol: string;
    health_status: string;
    playable_url?: string | null;
    embed_url?: string | null;
    diagnostics: Record<string, unknown>;
}

const TYPE_LABELS: Record<SensorSourceType, string> = {
    webcam: "Webcam",
    traffic_camera: "Traffic",
    audio: "Audio",
    ais: "AIS",
    adsb: "ADS-B",
    weather: "Weather",
    wildfire: "Wildfire",
    earthquake: "Quake",
    rf_presence: "RF",
    generic_stream: "Stream",
    manual: "Manual",
    blocked: "Blocked",
};

const TYPE_COLORS: Record<SensorSourceType, string> = {
    webcam: "#38bdf8",
    traffic_camera: "#a3e635",
    audio: "#f97316",
    ais: "#22c55e",
    adsb: "#60a5fa",
    weather: "#06b6d4",
    wildfire: "#ef4444",
    earthquake: "#f59e0b",
    rf_presence: "#c084fc",
    generic_stream: "#14b8a6",
    manual: "#eab308",
    blocked: "#64748b",
};

const MODE_PROFILES: Record<OperatorMode, { label: string; types: SensorSourceType[]; threshold: string }> = {
    "global-awareness": { label: "Global", types: ["webcam", "traffic_camera", "audio", "ais", "weather", "wildfire", "earthquake", "generic_stream", "manual"], threshold: "all" },
    "emergency-ops": { label: "Emergency", types: ["audio", "traffic_camera", "weather", "wildfire", "earthquake", "webcam"], threshold: "low+" },
    maritime: { label: "Maritime", types: ["ais", "weather", "webcam", "generic_stream"], threshold: "low+" },
    aviation: { label: "Aviation", types: ["adsb", "weather", "webcam", "generic_stream"], threshold: "low+" },
    weather: { label: "Weather", types: ["weather", "webcam", "traffic_camera", "wildfire"], threshold: "info+" },
    wildfire: { label: "Wildfire", types: ["wildfire", "weather", "webcam", "traffic_camera", "audio"], threshold: "low+" },
    infrastructure: { label: "Infra", types: ["traffic_camera", "webcam", "generic_stream", "manual"], threshold: "low+" },
    "property-defense": { label: "Property", types: ["webcam", "generic_stream", "manual", "weather", "audio"], threshold: "low+" },
    "rf-sentinel": { label: "RF", types: ["rf_presence", "manual"], threshold: "placeholder" },
    "family-safety": { label: "Family", types: ["traffic_camera", "weather", "wildfire", "earthquake", "audio"], threshold: "low+" },
};

const TIME_WINDOWS: Record<TimeWindow, number> = {
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
};

const ALL_FILTER_TYPES = Object.keys(TYPE_LABELS) as SensorSourceType[];

function locationLabel(item: EvidenceEntity): string {
    const city = typeof item.raw.city === "string" ? item.raw.city : null;
    const state = typeof item.raw.state === "string" ? item.raw.state : null;
    const country = typeof item.raw.country === "string" ? item.raw.country : null;
    return [city, state, country].filter(Boolean).join(", ")
        || (item.lat !== null && item.lon !== null ? `${item.lat.toFixed(3)}, ${item.lon.toFixed(3)}` : "Geo unknown");
}

function openExternal(url: string | null | undefined) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
}

function isHls(url: string): boolean {
    return url.toLowerCase().includes(".m3u8");
}

function isRecent(iso: string, windowKey: TimeWindow): boolean {
    const parsed = Date.parse(iso);
    if (!Number.isFinite(parsed)) return true;
    return Date.now() - parsed <= TIME_WINDOWS[windowKey];
}

function eventAge(event: SensorEvent): string {
    const parsed = Date.parse(event.created_at);
    if (!Number.isFinite(parsed)) return "now";
    const seconds = Math.max(0, Math.round((Date.now() - parsed) / 1000));
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    return `${Math.round(minutes / 60)}h`;
}

function toMapEntity(item: EvidenceEntity) {
    if (typeof item.lat !== "number" || typeof item.lon !== "number") return null;
    return {
        id: item.id,
        pluginId: "argos-live",
        latitude: item.lat,
        longitude: item.lon,
        altitude: item.alt ?? undefined,
        heading: item.heading ?? undefined,
        speed: item.speed ?? undefined,
        timestamp: new Date(item.last_seen),
        label: item.title,
        properties: { ...item, sourcePlugin: "argos-live", type: item.source_type },
    };
}

function mergeEntity(items: EvidenceEntity[], entity: EvidenceEntity): EvidenceEntity[] {
    const index = items.findIndex((item) => item.id === entity.id);
    if (index === -1) return [entity, ...items];
    const next = [...items];
    next[index] = entity;
    return next;
}

function VideoPreview({ item }: { item: EvidenceEntity }) {
    const url = item.embed_url ?? item.live_url;
    if (!url || item.legal_status === "blocked") {
        return (
            <div className="argos-live-view__empty">
                <ShieldAlert size={18} />
                <span>{item.legal_status === "blocked" ? "Provider blocked" : "Source-page handoff required"}</span>
            </div>
        );
    }

    if (item.embed_url) {
        return <iframe src={item.embed_url} title={item.title} allow="fullscreen; autoplay; picture-in-picture" loading="lazy" />;
    }

    if (isHls(url)) return <HlsPlayer src={url} />;

    return <img src={url} alt={item.title} />;
}

export function ArgosLivePanel() {
    const [providers, setProviders] = useState<ProviderHealth[]>([]);
    const [items, setItems] = useState<EvidenceEntity[]>([]);
    const [activity, setActivity] = useState<SensorEvent[]>([]);
    const [brief, setBrief] = useState<OperatorBrief | null>(null);
    const [correlations, setCorrelations] = useState<CorrelationObject[]>([]);
    const [anomalies, setAnomalies] = useState<AnomalyObject[]>([]);
    const [narrative, setNarrative] = useState<string>("");
    const [providerEnabled, setProviderEnabled] = useState<Record<string, boolean>>({});
    const [typeEnabled, setTypeEnabled] = useState<Record<SensorSourceType, boolean>>(() => Object.fromEntries(
        ALL_FILTER_TYPES.map((type) => [type, type !== "blocked"]),
    ) as Record<SensorSourceType, boolean>);
    const [operatorMode, setOperatorMode] = useState<OperatorMode>("global-awareness");
    const [timeWindow, setTimeWindow] = useState<TimeWindow>("15m");
    const [query, setQuery] = useState("");
    const [viewMode, setViewMode] = useState<ViewMode>("globe");
    const [activeItem, setActiveItem] = useState<EvidenceEntity | null>(null);
    const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});
    const [liveViewItem, setLiveViewItem] = useState<EvidenceEntity | null>(null);
    const [streamUrl, setStreamUrl] = useState("");
    const [streamTitle, setStreamTitle] = useState("");
    const [streamLat, setStreamLat] = useState("");
    const [streamLon, setStreamLon] = useState("");
    const [validation, setValidation] = useState<StreamValidation | null>(null);
    const [loading, setLoading] = useState(false);
    const [connectionState, setConnectionState] = useState<"connecting" | "live" | "degraded">("connecting");
    const [error, setError] = useState<string | null>(null);
    const argosEnabled = useStore((s) => s.layers["argos-live"]?.enabled ?? false);
    const argosEntities = useStore((s) => s.entitiesByPlugin["argos-live"] ?? []);

    const syncEntitiesToMap = useCallback((nextItems: EvidenceEntity[]) => {
        const entities = nextItems.map(toMapEntity).filter((entity): entity is NonNullable<ReturnType<typeof toMapEntity>> => !!entity);
        const state = useStore.getState();
        state.setEntities("argos-live", entities);
        state.setEntityCount("argos-live", entities.length);
        state.initLayer("argos-live", true);
    }, []);

    const refreshSnapshot = useCallback(async (force = false) => {
        setLoading(true);
        setError(null);
        try {
            if (force) {
                const refreshResponse = await fetch("/api/sensors/refresh", { method: "POST", cache: "no-store" });
                if (!refreshResponse.ok) throw new Error(`ARGOS refresh returned ${refreshResponse.status}`);
            }
            const [healthResponse, entitiesResponse, activityResponse, briefResponse, anomalyResponse, correlationResponse, narrativeResponse] = await Promise.all([
                fetch("/api/sensors/health", { cache: "no-store" }),
                fetch("/api/sensors/entities?limit=10000", { cache: "no-store" }),
                fetch("/api/sensors/events/recent?limit=80", { cache: "no-store" }),
                fetch(`/api/sensors/operator-brief?mode=${encodeURIComponent(operatorMode)}`, { cache: "no-store" }),
                fetch("/api/sensors/anomalies", { cache: "no-store" }),
                fetch("/api/sensors/correlations", { cache: "no-store" }),
                fetch(`/api/sensors/narrative?mode=${encodeURIComponent(operatorMode)}`, { cache: "no-store" }),
            ]);
            if (!healthResponse.ok) throw new Error(`ARGOS health returned ${healthResponse.status}`);
            if (!entitiesResponse.ok) throw new Error(`ARGOS entities returned ${entitiesResponse.status}`);
            const health = await healthResponse.json();
            const entityPayload = await entitiesResponse.json();
            const activityPayload = await activityResponse.json();
            const briefPayload = await briefResponse.json();
            const anomalyPayload = await anomalyResponse.json();
            const correlationPayload = await correlationResponse.json();
            const narrativePayload = await narrativeResponse.json();
            const nextProviders = Array.isArray(health.providers) ? health.providers as ProviderHealth[] : [];
            const nextItems = Array.isArray(entityPayload.entities) ? entityPayload.entities as EvidenceEntity[] : [];
            setProviders(nextProviders);
            setItems(nextItems);
            syncEntitiesToMap(nextItems);
            setActivity(Array.isArray(activityPayload.events) ? activityPayload.events as SensorEvent[] : []);
            setBrief(briefPayload.brief ?? null);
            setAnomalies(Array.isArray(anomalyPayload.anomalies) ? anomalyPayload.anomalies as AnomalyObject[] : []);
            setCorrelations(Array.isArray(correlationPayload.correlations) ? correlationPayload.correlations as CorrelationObject[] : []);
            setNarrative(typeof narrativePayload.narrative?.summary === "string" ? narrativePayload.narrative.summary : "");
            setProviderEnabled((current) => {
                const next = { ...current };
                for (const provider of nextProviders) {
                    if (next[provider.provider_id] === undefined) next[provider.provider_id] = provider.health !== "blocked";
                }
                return next;
            });
            setActiveItem((current) => current ?? nextItems[0] ?? null);
        } catch (err: any) {
            setError(err?.message ?? String(err));
        } finally {
            setLoading(false);
        }
    }, [operatorMode, syncEntitiesToMap]);

    useEffect(() => {
        void refreshSnapshot(true);
    }, [refreshSnapshot]);

    useEffect(() => {
        const source = new EventSource("/api/sensors/events/live");
        source.onopen = () => setConnectionState("live");
        source.onerror = () => setConnectionState("degraded");
        source.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data) as SensorEvent;
                if (payload.type === "connected" || payload.type === "heartbeat") return;
                setActivity((current) => [payload, ...current.filter((item) => item.id !== payload.id)].slice(0, 120));
                if (payload.payload.entity) {
                    setItems((current) => {
                        const next = payload.type === "entity_removed"
                            ? current.filter((item) => item.id !== payload.payload.entity?.id)
                            : mergeEntity(current, payload.payload.entity!);
                        syncEntitiesToMap(next);
                        return next;
                    });
                }
                if (payload.payload.health) {
                    setProviders((current) => {
                        const index = current.findIndex((provider) => provider.provider_id === payload.payload.health?.provider_id);
                        if (index === -1) return [payload.payload.health!, ...current];
                        const next = [...current];
                        next[index] = payload.payload.health!;
                        return next;
                    });
                }
                if (payload.payload.brief) setBrief(payload.payload.brief);
                if (payload.payload.anomaly) setAnomalies((current) => [payload.payload.anomaly!, ...current.filter((item) => item.id !== payload.payload.anomaly?.id)].slice(0, 40));
                if (payload.payload.correlation) setCorrelations((current) => [payload.payload.correlation!, ...current.filter((item) => item.id !== payload.payload.correlation?.id)].slice(0, 40));
            } catch {
                setConnectionState("degraded");
            }
        };
        return () => source.close();
    }, [syncEntitiesToMap]);

    const filteredItems = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return items.filter((item) => {
            if (!providerEnabled[item.provider]) return false;
            if (!typeEnabled[item.source_type]) return false;
            if (!isRecent(item.last_seen, timeWindow) && item.status !== "stale") return false;
            if (!needle) return true;
            return [item.title, item.description, item.provider, item.source_type, item.status, item.severity, locationLabel(item), ...item.tags]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(needle);
        });
    }, [items, providerEnabled, query, timeWindow, typeEnabled]);

    const stats = useMemo(() => {
        const counts = new Map<SensorSourceType, number>();
        for (const item of filteredItems) counts.set(item.source_type, (counts.get(item.source_type) ?? 0) + 1);
        return {
            visible: filteredItems.length,
            mapped: filteredItems.filter((item) => item.lat !== null && item.lon !== null).length,
            playable: filteredItems.filter((item) => item.live_url || item.embed_url).length,
            stale: filteredItems.filter((item) => item.status === "stale" || item.freshness_score < 0.2).length,
            high: filteredItems.filter((item) => item.severity === "high" || item.severity === "critical").length,
            counts,
        };
    }, [filteredItems]);

    const selectedCorrelations = useMemo(() => {
        const ids = Object.entries(selectedIds).filter(([, selected]) => selected).map(([id]) => id);
        if (!ids.length) return [];
        return correlations.filter((correlation) => ids.some((id) => correlation.entities.includes(id)));
    }, [correlations, selectedIds]);

    const enableArgosLayer = async () => {
        const state = useStore.getState();
        state.initLayer("argos-live", true);
        state.setLayerEnabled("argos-live", true);
        state.setHighlightLayerId("argos-live");
        state.setSelectedEntity(null);
        state.setConfigPanelOpen(true);
        state.setActiveConfigTab("intel");
        syncEntitiesToMap(filteredItems);
        await pluginManager.enablePlugin("argos-live");
        trackEvent("argos-layer-load", { source: "argos-live-panel" });
    };

    const loadSampleLayer = async () => {
        const state = useStore.getState();
        state.initLayer("sample-intelligence", true);
        state.setLayerEnabled("sample-intelligence", true);
        state.setHighlightLayerId("sample-intelligence");
        await pluginManager.enablePlugin("sample-intelligence");
        await refreshSnapshot(true);
    };

    const applyMode = (mode: OperatorMode) => {
        setOperatorMode(mode);
        const enabled = new Set(MODE_PROFILES[mode].types);
        setTypeEnabled(Object.fromEntries(ALL_FILTER_TYPES.map((type) => [type, enabled.has(type)])) as Record<SensorSourceType, boolean>);
        setTimeWindow(mode === "global-awareness" ? "15m" : "1h");
    };

    const validateCurrentStream = async () => {
        setError(null);
        setValidation(null);
        const response = await fetch("/api/sensors/streams/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source_url: streamUrl }),
        });
        const data = await response.json();
        setValidation(data.validation ?? null);
    };

    const addStream = async () => {
        setError(null);
        const response = await fetch("/api/sensors/streams/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                source_url: streamUrl,
                title: streamTitle,
                lat: streamLat ? Number(streamLat) : null,
                lon: streamLon ? Number(streamLon) : null,
                tags: ["user-added"],
            }),
        });
        const data = await response.json();
        if (!response.ok) {
            setValidation(data.validation ?? null);
            setError(data.diagnostics?.unavailable_reason ?? data.validation?.diagnostics?.reason ?? "Stream could not be added.");
            return;
        }
        setValidation(data.validation ?? null);
        setStreamUrl("");
        setStreamTitle("");
        setStreamLat("");
        setStreamLon("");
        await refreshSnapshot(false);
        await enableArgosLayer();
    };

    const openLiveView = (item: EvidenceEntity) => {
        if (item.legal_status !== "blocked" && (item.embed_url || item.live_url)) {
            setLiveViewItem(item);
            return;
        }
        openExternal(item.source_page_url);
    };

    return (
        <div className="argos-panel">
            <div className="argos-panel__header">
                <div>
                    <div className="argos-panel__title">
                        <Radio size={15} />
                        <span>ARGOS NRT Fusion</span>
                    </div>
                    <div className="argos-panel__subtitle">
                        {argosEntities.length.toLocaleString()} map entities / SSE {connectionState}
                    </div>
                </div>
                <button type="button" className="argos-panel__icon-btn" title="Refresh ARGOS" onClick={() => { void refreshSnapshot(true); }} disabled={loading}>
                    <RefreshCw size={15} className={loading ? "argos-panel__spin" : undefined} />
                </button>
            </div>

            <div className="argos-panel__stats argos-panel__stats--five">
                <div><span>{stats.visible.toLocaleString()}</span><small>visible</small></div>
                <div><span>{stats.mapped.toLocaleString()}</span><small>mapped</small></div>
                <div><span>{stats.playable.toLocaleString()}</span><small>playable</small></div>
                <div><span>{stats.stale.toLocaleString()}</span><small>stale</small></div>
                <div><span>{stats.high.toLocaleString()}</span><small>high</small></div>
            </div>

            <div className="argos-action-row">
                <button type="button" className={`argos-panel__load-btn ${argosEnabled ? "argos-panel__load-btn--active" : ""}`} onClick={() => { void enableArgosLayer(); }}>
                    <Power size={14} />
                    <span>{argosEnabled ? "ARGOS layer enabled" : "Enable ARGOS layer"}</span>
                </button>
                <button type="button" className="argos-panel__load-btn" onClick={() => { void loadSampleLayer(); }}>
                    <Layers size={14} />
                    <span>Load sample intelligence layer</span>
                </button>
            </div>

            <div className="argos-mode-grid">
                {(Object.keys(MODE_PROFILES) as OperatorMode[]).map((mode) => (
                    <button key={mode} type="button" className={operatorMode === mode ? "argos-panel__mode--active" : ""} onClick={() => applyMode(mode)}>
                        {MODE_PROFILES[mode].label}
                    </button>
                ))}
            </div>

            <div className="argos-panel__modes">
                {(["globe", "grid", "wall", "focus", "pip"] as const).map((mode) => (
                    <button key={mode} type="button" className={viewMode === mode ? "argos-panel__mode--active" : ""} onClick={() => setViewMode(mode)}>
                        {mode}
                    </button>
                ))}
            </div>

            <div className="argos-panel__modes">
                {(Object.keys(TIME_WINDOWS) as TimeWindow[]).map((windowKey) => (
                    <button key={windowKey} type="button" className={timeWindow === windowKey ? "argos-panel__mode--active" : ""} onClick={() => setTimeWindow(windowKey)}>
                        {windowKey}
                    </button>
                ))}
            </div>

            <input
                className="argos-panel__search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter source, type, location, severity"
            />

            <div className="argos-panel__type-filters">
                {ALL_FILTER_TYPES.map((type) => (
                    <button
                        key={type}
                        type="button"
                        className={typeEnabled[type] ? "argos-panel__type--active" : ""}
                        style={{ borderColor: TYPE_COLORS[type] }}
                        onClick={() => setTypeEnabled((current) => ({ ...current, [type]: !current[type] }))}
                    >
                        {TYPE_LABELS[type]}
                        <span>{stats.counts.get(type) ?? 0}</span>
                    </button>
                ))}
            </div>

            {error && (
                <div className="argos-panel__error">
                    <AlertTriangle size={14} />
                    <span>{error}</span>
                </div>
            )}

            {items.length === 0 && !loading && (
                <div className="argos-panel__diagnostic">
                    <AlertTriangle size={16} />
                    <span>No data loaded</span>
                </div>
            )}

            <div className="argos-panel__section">
                <div className="argos-panel__section-title">Live Source Status</div>
                <div className="argos-provider-list">
                    {providers.map((provider) => (
                        <div key={provider.provider_id} className={`argos-provider argos-provider--${provider.health}`}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={providerEnabled[provider.provider_id] ?? false}
                                    onChange={() => setProviderEnabled((current) => ({ ...current, [provider.provider_id]: !(current[provider.provider_id] ?? false) }))}
                                />
                                <span>{provider.display_name}</span>
                            </label>
                            <div className="argos-provider__meta">
                                {provider.health === "healthy" && <CheckCircle2 size={12} />}
                                {provider.health === "api_required" && <KeyRound size={12} />}
                                {provider.health === "blocked" && <ShieldAlert size={12} />}
                                {provider.health !== "healthy" && provider.health !== "api_required" && provider.health !== "blocked" && <AlertTriangle size={12} />}
                                <span>{provider.health.replace("_", " ")}</span>
                                <small>{provider.entity_count.toLocaleString()} / stale {provider.stale_count.toLocaleString()} / {provider.refresh_interval_seconds}s</small>
                            </div>
                            {provider.error_state && <small className="argos-provider__error">{provider.error_state}</small>}
                        </div>
                    ))}
                </div>
            </div>

            <div className="argos-panel__section">
                <div className="argos-panel__section-title">Intelligence Compression</div>
                <div className="argos-brief">
                    <div className="argos-brief__header">
                        <Sparkles size={14} />
                        <span>{brief ? new Date(brief.generated_at).toLocaleTimeString() : "Pending brief"}</span>
                    </div>
                    {brief?.stale_data_warning && <div className="argos-brief__warning">{brief.stale_data_warning}</div>}
                    {(brief?.top_items ?? []).slice(0, 3).map((item, index) => (
                        <div key={`${item.title}-${index}`} className={`argos-brief__item argos-severity--${item.severity}`}>
                            <strong>{item.title}</strong>
                            <span>{item.summary}</span>
                            <small>{item.why_it_matters}</small>
                            <em>{item.recommended_action} / confidence {(item.confidence * 100).toFixed(0)}%</em>
                        </div>
                    ))}
                </div>
            </div>

            <div className="argos-panel__section">
                <div className="argos-panel__section-title">NRT Activity Feed</div>
                <div className="argos-activity-list">
                    {activity.slice(0, 10).map((event) => (
                        <button key={event.id} type="button" className={`argos-activity argos-severity--${event.severity}`} onClick={() => event.entity_id && setActiveItem(items.find((item) => item.id === event.entity_id) ?? activeItem)}>
                            <Clock size={12} />
                            <span>{event.summary}</span>
                            <small>{eventAge(event)} / {event.provider ?? "system"}</small>
                        </button>
                    ))}
                    {activity.length === 0 && <div className="argos-empty-line">No changes received yet</div>}
                </div>
            </div>

            <div className="argos-panel__section">
                <div className="argos-panel__section-title">Add Stream</div>
                <div className="argos-stream-form">
                    <input value={streamUrl} onChange={(event) => setStreamUrl(event.target.value)} placeholder="RTSP, RTMP, HLS, MJPEG, iframe, YouTube, WebRTC, snapshot URL" />
                    <input value={streamTitle} onChange={(event) => setStreamTitle(event.target.value)} placeholder="Title" />
                    <div className="argos-stream-form__grid">
                        <input value={streamLat} onChange={(event) => setStreamLat(event.target.value)} placeholder="Lat" />
                        <input value={streamLon} onChange={(event) => setStreamLon(event.target.value)} placeholder="Lon" />
                    </div>
                    <div className="argos-stream-form__actions">
                        <button type="button" onClick={() => { void validateCurrentStream(); }} disabled={!streamUrl}>
                            <RefreshCw size={13} />
                            <span>Validate</span>
                        </button>
                        <button type="button" onClick={() => { void addStream(); }} disabled={!streamUrl}>
                            <Plus size={13} />
                            <span>Add Stream</span>
                        </button>
                    </div>
                    {validation && (
                        <div className={`argos-validation argos-validation--${validation.ok ? "ok" : "bad"}`}>
                            <span>{validation.protocol}</span>
                            <small>{validation.health_status}</small>
                        </div>
                    )}
                </div>
            </div>

            <div className="argos-panel__section">
                <div className="argos-panel__section-title">Live Items</div>
                <div className={`argos-item-list argos-item-list--${viewMode}`}>
                    {filteredItems.slice(0, viewMode === "wall" ? 16 : 100).map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`argos-item ${activeItem?.id === item.id ? "argos-item--active" : ""} ${item.status === "stale" ? "argos-item--stale" : ""}`}
                            onClick={() => setActiveItem(item)}
                        >
                            <span className="argos-item__topline">
                                <input
                                    type="checkbox"
                                    checked={selectedIds[item.id] ?? false}
                                    onChange={(event) => {
                                        event.stopPropagation();
                                        setSelectedIds((current) => ({ ...current, [item.id]: !current[item.id] }));
                                    }}
                                    onClick={(event) => event.stopPropagation()}
                                />
                                <span className="argos-item__type" style={{ backgroundColor: TYPE_COLORS[item.source_type] }}>{TYPE_LABELS[item.source_type]}</span>
                                <span className={`argos-item__legal argos-item__legal--${item.legal_status}`}>{item.legal_status.replace("_", " ")}</span>
                            </span>
                            <strong>{item.title}</strong>
                            <small>{locationLabel(item)}</small>
                            <small>fresh {(item.freshness_score * 100).toFixed(0)}% / trust {(item.trust_score * 100).toFixed(0)}%</small>
                        </button>
                    ))}
                </div>
                {filteredItems.length === 0 && <div className="argos-empty-line">No data loaded for current filters</div>}
            </div>

            <div className="argos-panel__section">
                <div className="argos-panel__section-title">Correlation Queue</div>
                <div className="argos-correlation-box">
                    <span>{Object.values(selectedIds).filter(Boolean).length} selected</span>
                    <button type="button" onClick={() => setCorrelations((current) => [...selectedCorrelations, ...current].slice(0, 40))}>
                        <Activity size={13} />
                        <span>Ask for correlation</span>
                    </button>
                    {(selectedCorrelations[0] ?? correlations[0]) && (
                        <small>{(selectedCorrelations[0] ?? correlations[0]).summary}</small>
                    )}
                </div>
            </div>

            {activeItem && (
                <div className="argos-focus">
                    <div className="argos-inspector__title">
                        <Eye size={14} />
                        <strong>{activeItem.title}</strong>
                    </div>
                    <span>{locationLabel(activeItem)}</span>
                    <div className="argos-inspector-grid">
                        <div><small>type</small><strong>{activeItem.source_type}</strong></div>
                        <div><small>severity</small><strong>{activeItem.severity ?? "info"}</strong></div>
                        <div><small>fresh</small><strong>{(activeItem.freshness_score * 100).toFixed(0)}%</strong></div>
                        <div><small>trust</small><strong>{(activeItem.trust_score * 100).toFixed(0)}%</strong></div>
                    </div>
                    <div className="argos-focus__actions">
                        <button type="button" onClick={() => openLiveView(activeItem)}>
                            <Play size={13} />
                            <span>Open Live View</span>
                        </button>
                        <button type="button" onClick={() => openExternal(activeItem.source_page_url)}>
                            <ExternalLink size={13} />
                            <span>Open Source Page</span>
                        </button>
                    </div>
                    <pre className="argos-raw-preview">{JSON.stringify({ raw: activeItem.raw, diagnostics: activeItem.diagnostics }, null, 2).slice(0, 1200)}</pre>
                </div>
            )}

            {narrative && (
                <div className="argos-panel__diagnostic argos-panel__diagnostic--info">
                    <Activity size={15} />
                    <span>{narrative}</span>
                </div>
            )}

            <div className="argos-rf-placeholder">
                <Wifi size={14} />
                <span>RF Sentinel placeholder: occupancy, density heatmap, movement flow, dwell time, and sensor health schema only.</span>
            </div>

            {liveViewItem && (
                <div className={`argos-live-view ${viewMode === "pip" ? "argos-live-view--pip" : ""}`}>
                    <div className="argos-live-view__header">
                        <span>{liveViewItem.title}</span>
                        <button type="button" onClick={() => setLiveViewItem(null)}>Close</button>
                    </div>
                    <div className="argos-live-view__media">
                        <VideoPreview item={liveViewItem} />
                    </div>
                </div>
            )}

            {loading && (
                <div className="argos-panel__loading">
                    <Loader2 size={16} className="argos-panel__spin" />
                    <span>Refreshing ARGOS</span>
                </div>
            )}
        </div>
    );
}
