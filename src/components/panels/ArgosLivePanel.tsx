"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, KeyRound, Loader2, Play, Plus, Power, RefreshCw, ShieldAlert, Video } from "lucide-react";

import { pluginManager } from "@/core/plugins/PluginManager";
import { useStore } from "@/core/state/store";
import { trackEvent } from "@/lib/analytics";
import { HlsPlayer } from "@/components/video/HlsPlayer";

type ArgosType = "webcam" | "traffic_camera" | "audio" | "ais" | "blocked";

interface ArgosItem {
    id: string;
    provider: string;
    type: ArgosType;
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
    legal_status: "approved" | "api_required" | "blocked" | "unknown";
    last_checked: string;
    diagnostics: Record<string, unknown>;
}

interface ProviderHealth {
    provider_id: string;
    display_name: string;
    source_type: ArgosType;
    status: "healthy" | "degraded" | "unavailable" | "api_required" | "blocked";
    requires_api_key: boolean;
    terms_url: string;
    item_count: number | null;
    message: string;
}

interface StreamValidation {
    ok: boolean;
    protocol: string;
    health_status: string;
    diagnostics: Record<string, unknown>;
}

const TYPE_LABELS: Record<ArgosType, string> = {
    webcam: "Webcams",
    traffic_camera: "Traffic",
    audio: "Audio",
    ais: "AIS",
    blocked: "Blocked",
};

const TYPE_COLORS: Record<ArgosType, string> = {
    webcam: "#38bdf8",
    traffic_camera: "#a3e635",
    audio: "#f97316",
    ais: "#22c55e",
    blocked: "#64748b",
};

function itemLocation(item: ArgosItem): string {
    return [item.city, item.state, item.country].filter(Boolean).join(", ") || "Geo unknown";
}

function openExternal(url: string | null | undefined) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
}

function isHls(url: string): boolean {
    return url.toLowerCase().includes(".m3u8");
}

function VideoPreview({ item }: { item: ArgosItem }) {
    const url = item.embed_url ?? item.live_url;
    if (!url || item.legal_status !== "approved") {
        return (
            <div className="argos-live-view__empty">
                <ShieldAlert size={18} />
                <span>Source-page handoff required</span>
            </div>
        );
    }

    if (item.embed_url) {
        return <iframe src={item.embed_url} title={item.title} allow="fullscreen; autoplay" loading="lazy" />;
    }

    if (isHls(url)) {
        return <HlsPlayer src={url} />;
    }

    return <img src={url} alt={item.title} />;
}

export function ArgosLivePanel() {
    const [providers, setProviders] = useState<ProviderHealth[]>([]);
    const [items, setItems] = useState<ArgosItem[]>([]);
    const [providerEnabled, setProviderEnabled] = useState<Record<string, boolean>>({});
    const [typeEnabled, setTypeEnabled] = useState<Record<ArgosType, boolean>>({
        webcam: true,
        traffic_camera: true,
        audio: true,
        ais: true,
        blocked: false,
    });
    const [query, setQuery] = useState("");
    const [viewMode, setViewMode] = useState<"map" | "grid" | "wall" | "focus">("map");
    const [activeItem, setActiveItem] = useState<ArgosItem | null>(null);
    const [liveViewItem, setLiveViewItem] = useState<ArgosItem | null>(null);
    const [streamUrl, setStreamUrl] = useState("");
    const [streamTitle, setStreamTitle] = useState("");
    const [streamLat, setStreamLat] = useState("");
    const [streamLon, setStreamLon] = useState("");
    const [validation, setValidation] = useState<StreamValidation | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const argosEnabled = useStore((s) => s.layers["argos-live"]?.enabled ?? false);
    const argosEntities = useStore((s) => s.entitiesByPlugin["argos-live"] ?? []);

    const refresh = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [healthResponse, catalogResponse] = await Promise.all([
                fetch("/api/live-sources/health", { cache: "no-store" }),
                fetch("/api/live-sources/catalog?limit=10000", { cache: "no-store" }),
            ]);
            if (!healthResponse.ok) throw new Error(`ARGOS health returned ${healthResponse.status}`);
            if (!catalogResponse.ok) throw new Error(`ARGOS catalog returned ${catalogResponse.status}`);
            const health = await healthResponse.json();
            const catalog = await catalogResponse.json();
            const nextProviders = Array.isArray(health.providers) ? health.providers as ProviderHealth[] : [];
            const nextItems = Array.isArray(catalog.items) ? catalog.items as ArgosItem[] : [];
            setProviders(nextProviders);
            setItems(nextItems);
            setProviderEnabled((current) => {
                const next = { ...current };
                for (const provider of nextProviders) {
                    if (next[provider.provider_id] === undefined) {
                        next[provider.provider_id] = provider.status !== "blocked";
                    }
                }
                return next;
            });
            if (!activeItem && nextItems.length) setActiveItem(nextItems[0]);
        } catch (err: any) {
            setError(err?.message ?? String(err));
        } finally {
            setLoading(false);
        }
    }, [activeItem]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const filteredItems = useMemo(() => {
        const needle = query.trim().toLowerCase();
        return items.filter((item) => {
            if (!providerEnabled[item.provider]) return false;
            if (!typeEnabled[item.type]) return false;
            if (!needle) return true;
            return [item.title, item.description, item.city, item.state, item.country, item.provider, item.type]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(needle);
        });
    }, [items, providerEnabled, query, typeEnabled]);

    const stats = useMemo(() => {
        const counts = new Map<ArgosType, number>();
        for (const item of filteredItems) counts.set(item.type, (counts.get(item.type) ?? 0) + 1);
        return {
            visible: filteredItems.length,
            mapped: filteredItems.filter((item) => item.lat !== null && item.lon !== null).length,
            live: filteredItems.filter((item) => item.live_url || item.embed_url).length,
            counts,
        };
    }, [filteredItems]);

    const enableArgosLayer = async () => {
        const state = useStore.getState();
        state.initLayer("argos-live", true);
        state.setLayerEnabled("argos-live", true);
        state.setHighlightLayerId("argos-live");
        state.setSelectedEntity(null);
        state.setConfigPanelOpen(true);
        state.setActiveConfigTab("intel");
        await pluginManager.enablePlugin("argos-live");
        trackEvent("argos-layer-load", { source: "argos-live-panel" });
    };

    const applyPanelFiltersToMap = () => {
        const entities = filteredItems
            .filter((item) => typeof item.lat === "number" && typeof item.lon === "number")
            .map((item) => ({
                id: item.id,
                pluginId: "argos-live",
                latitude: item.lat as number,
                longitude: item.lon as number,
                timestamp: new Date(item.last_checked),
                label: item.title,
                properties: { ...item, sourcePlugin: "argos-live" },
            }));
        const state = useStore.getState();
        state.setEntities("argos-live", entities);
        state.setEntityCount("argos-live", entities.length);
        state.initLayer("argos-live", true);
        state.setLayerEnabled("argos-live", true);
    };

    const validateCurrentStream = async () => {
        setError(null);
        setValidation(null);
        const response = await fetch("/api/live-sources/streams/validate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ source_url: streamUrl }),
        });
        const data = await response.json();
        setValidation(data.validation ?? null);
    };

    const addStream = async () => {
        setError(null);
        const response = await fetch("/api/live-sources/streams", {
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
            setError(data.validation?.diagnostics?.reason ?? "Stream could not be added.");
            return;
        }
        setValidation(data.validation ?? null);
        setStreamUrl("");
        setStreamTitle("");
        await refresh();
        await enableArgosLayer();
    };

    const openLiveView = (item: ArgosItem) => {
        if (item.legal_status === "approved" && (item.embed_url || item.live_url)) {
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
                        <Video size={15} />
                        <span>ARGOS Live Sources</span>
                    </div>
                    <div className="argos-panel__subtitle">
                        {argosEntities.length.toLocaleString()} map entities
                    </div>
                </div>
                <button type="button" className="argos-panel__icon-btn" title="Refresh ARGOS" onClick={() => { void refresh(); }} disabled={loading}>
                    <RefreshCw size={15} className={loading ? "argos-panel__spin" : undefined} />
                </button>
            </div>

            <div className="argos-panel__stats">
                <div><span>{stats.visible.toLocaleString()}</span><small>visible</small></div>
                <div><span>{stats.mapped.toLocaleString()}</span><small>mapped</small></div>
                <div><span>{stats.live.toLocaleString()}</span><small>live URLs</small></div>
            </div>

            <button type="button" className={`argos-panel__load-btn ${argosEnabled ? "argos-panel__load-btn--active" : ""}`} onClick={() => { void enableArgosLayer(); }}>
                <Power size={14} />
                <span>{argosEnabled ? "ARGOS layer enabled" : "Load ARGOS live layer"}</span>
            </button>

            <div className="argos-panel__modes">
                {(["map", "grid", "wall", "focus"] as const).map((mode) => (
                    <button key={mode} type="button" className={viewMode === mode ? "argos-panel__mode--active" : ""} onClick={() => setViewMode(mode)}>
                        {mode}
                    </button>
                ))}
            </div>

            <input
                className="argos-panel__search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter source, type, city, state"
            />

            <div className="argos-panel__type-filters">
                {(Object.keys(TYPE_LABELS) as ArgosType[]).map((type) => (
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
                <div className="argos-panel__section-title">Provider Health</div>
                <div className="argos-provider-list">
                    {providers.map((provider) => (
                        <div key={provider.provider_id} className={`argos-provider argos-provider--${provider.status}`}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={providerEnabled[provider.provider_id] ?? false}
                                    onChange={() => setProviderEnabled((current) => ({ ...current, [provider.provider_id]: !(current[provider.provider_id] ?? false) }))}
                                />
                                <span>{provider.display_name}</span>
                            </label>
                            <div className="argos-provider__meta">
                                {provider.status === "healthy" && <CheckCircle2 size={12} />}
                                {provider.status === "api_required" && <KeyRound size={12} />}
                                {provider.status === "blocked" && <ShieldAlert size={12} />}
                                {provider.status !== "healthy" && provider.status !== "api_required" && provider.status !== "blocked" && <AlertTriangle size={12} />}
                                <span>{provider.status.replace("_", " ")}</span>
                                <small>{provider.item_count === null ? "pending" : provider.item_count.toLocaleString()}</small>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="argos-panel__section">
                <div className="argos-panel__section-title">Add Stream</div>
                <div className="argos-stream-form">
                    <input value={streamUrl} onChange={(event) => setStreamUrl(event.target.value)} placeholder="RTSP, RTMP, HLS, MJPEG, iframe, YouTube, snapshot URL" />
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
                    {filteredItems.slice(0, viewMode === "wall" ? 12 : 80).map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            className={`argos-item ${activeItem?.id === item.id ? "argos-item--active" : ""}`}
                            onClick={() => setActiveItem(item)}
                        >
                            <span className="argos-item__type" style={{ backgroundColor: TYPE_COLORS[item.type] }}>{item.type.replace("_", " ")}</span>
                            <strong>{item.title}</strong>
                            <small>{itemLocation(item)}</small>
                            <span className={`argos-item__legal argos-item__legal--${item.legal_status}`}>{item.legal_status.replace("_", " ")}</span>
                        </button>
                    ))}
                </div>
            </div>

            {activeItem && (
                <div className="argos-focus">
                    <div>
                        <strong>{activeItem.title}</strong>
                        <span>{itemLocation(activeItem)}</span>
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
                    <button type="button" className="argos-focus__apply" onClick={applyPanelFiltersToMap}>
                        Apply filters to map
                    </button>
                </div>
            )}

            {liveViewItem && (
                <div className="argos-live-view">
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
