"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Camera, CheckCircle2, KeyRound, Loader2, Power, RefreshCw } from "lucide-react";

import { pluginManager } from "@/core/plugins/PluginManager";
import { useStore } from "@/core/state/store";
import { trackEvent } from "@/lib/analytics";

type CameraPriority = "initial" | "expanded";

interface CameraAdapterMeta {
    id: string;
    displayName: string;
    region: string;
    country?: string;
    state?: string;
    priority?: CameraPriority;
    requiresKey?: {
        envVar: string;
        signupUrl: string;
    };
    healthy: boolean;
    lastFetchedAt: string | null;
    lastFeatureCount: number | null;
    lastError?: string;
}

const PRIORITY_STATE_ORDER = new Map([
    ["GA", 0],
    ["FL", 1],
    ["TN", 2],
]);

const US_STATE_CODES = [
    "GA", "FL", "TN",
    "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
    "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
    "OR", "PA", "RI", "SC", "SD", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
];

const DEFAULT_CAMERA_ADAPTERS: CameraAdapterMeta[] = [
    { id: "gdot", displayName: "GDOT (Georgia)", region: "United States - Georgia", country: "United States", state: "GA", priority: "initial", healthy: false, lastFetchedAt: null, lastFeatureCount: null },
    { id: "fl511-public", displayName: "FL511 Public ArcGIS (Florida)", region: "United States - Florida", country: "United States", state: "FL", priority: "initial", healthy: false, lastFetchedAt: null, lastFeatureCount: null },
    { id: "tn-smartway", displayName: "TDOT SmartWay (Tennessee)", region: "United States - Tennessee", country: "United States", state: "TN", priority: "initial", healthy: false, lastFetchedAt: null, lastFeatureCount: null },
    { id: "caltrans", displayName: "Caltrans (California)", region: "United States - California", country: "United States", state: "CA", priority: "expanded", healthy: false, lastFetchedAt: null, lastFeatureCount: null },
    { id: "chart-md", displayName: "Maryland CHART", region: "United States - Maryland", country: "United States", state: "MD", priority: "expanded", healthy: false, lastFetchedAt: null, lastFeatureCount: null },
    { id: "ny511", displayName: "511NY (New York State)", region: "United States - New York", country: "United States", state: "NY", priority: "expanded", healthy: false, lastFetchedAt: null, lastFeatureCount: null },
    { id: "tfl", displayName: "TfL JamCams (London)", region: "United Kingdom - London", country: "United Kingdom", priority: "expanded", healthy: false, lastFetchedAt: null, lastFeatureCount: null },
    { id: "wsdot", displayName: "WSDOT (Washington State)", region: "United States - Washington", country: "United States", state: "WA", priority: "expanded", requiresKey: { envVar: "WSDOT_API_KEY", signupUrl: "https://wsdot.wa.gov/traffic/api/" }, healthy: false, lastFetchedAt: null, lastFeatureCount: null },
    { id: "ohgo", displayName: "OHGO (Ohio)", region: "United States - Ohio", country: "United States", state: "OH", priority: "expanded", requiresKey: { envVar: "OHGO_API_KEY", signupUrl: "https://publicapi.ohgo.com/docs/registration" }, healthy: false, lastFetchedAt: null, lastFeatureCount: null },
    { id: "fl511", displayName: "FL511 (Florida)", region: "United States - Florida", country: "United States", state: "FL", priority: "expanded", requiresKey: { envVar: "FL511_API_KEY", signupUrl: "https://fl511.com/developers/doc" }, healthy: false, lastFetchedAt: null, lastFeatureCount: null },
];

function formatCount(value: number | null): string {
    return typeof value === "number" ? value.toLocaleString() : "pending";
}

function statusLabel(adapter: CameraAdapterMeta): string {
    if (adapter.requiresKey && adapter.lastFeatureCount === null) return "key";
    if (adapter.healthy) return "live";
    if (adapter.lastError) return "error";
    if (adapter.lastFeatureCount === 0) return "empty";
    return "standby";
}

function sourceSort(a: CameraAdapterMeta, b: CameraAdapterMeta): number {
    const stateA = PRIORITY_STATE_ORDER.get(a.state ?? "") ?? 99;
    const stateB = PRIORITY_STATE_ORDER.get(b.state ?? "") ?? 99;
    if (stateA !== stateB) return stateA - stateB;
    return a.displayName.localeCompare(b.displayName);
}

function StatusIcon({ adapter, loading }: { adapter: CameraAdapterMeta; loading: boolean }) {
    if (loading) return <Loader2 className="camera-sources__spin" size={14} />;
    if (adapter.requiresKey && adapter.lastFeatureCount === null) return <KeyRound size={14} />;
    if (adapter.healthy) return <CheckCircle2 size={14} />;
    if (adapter.lastError) return <AlertTriangle size={14} />;
    return <Camera size={14} />;
}

function SourceRow({ adapter, loading }: { adapter: CameraAdapterMeta; loading: boolean }) {
    const status = statusLabel(adapter);

    return (
        <div className={`camera-source-row camera-source-row--${status}`}>
            <div className="camera-source-row__main">
                <div className="camera-source-row__name">
                    <span className="camera-source-row__state">{adapter.state ?? adapter.country ?? "--"}</span>
                    <span>{adapter.displayName}</span>
                </div>
                <div className="camera-source-row__region">{adapter.region}</div>
                {adapter.lastError && <div className="camera-source-row__error">{adapter.lastError}</div>}
                {adapter.requiresKey && (
                    <div className="camera-source-row__key">
                        <KeyRound size={12} />
                        <span>{adapter.requiresKey.envVar}</span>
                    </div>
                )}
            </div>
            <div className="camera-source-row__metrics">
                <div className="camera-source-row__count">{formatCount(adapter.lastFeatureCount)}</div>
                <div className="camera-source-row__status">
                    <StatusIcon adapter={adapter} loading={loading} />
                    <span>{status}</span>
                </div>
            </div>
        </div>
    );
}

export function CameraSourcesPanel() {
    const [adapters, setAdapters] = useState<CameraAdapterMeta[]>(DEFAULT_CAMERA_ADAPTERS);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadedAt, setLoadedAt] = useState<Date | null>(null);
    const cameraEnabled = useStore((s) => s.layers.camera?.enabled ?? false);
    const cameraEntities = useStore((s) => s.entitiesByPlugin.camera ?? []);
    const cameraEntityCount = cameraEntities.length;

    const countsBySource = useMemo(() => {
        const counts = new Map<string, number>();
        for (const entity of cameraEntities) {
            const source = typeof entity.properties.source === "string" ? entity.properties.source : "unknown";
            counts.set(source, (counts.get(source) ?? 0) + 1);
        }
        return counts;
    }, [cameraEntities]);

    const loadSources = useCallback(async (refresh = false) => {
        setLoading(true);
        setError(null);
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 8000);

        try {
            const params = new URLSearchParams();
            if (refresh) params.set("refresh", "1");
            const query = params.toString();
            const response = await fetch(`/api/camera/list${query ? `?${query}` : ""}`, {
                cache: "no-store",
                headers: { Accept: "application/json" },
                signal: controller.signal,
            });

            if (!response.ok) throw new Error(`Camera source list returned ${response.status}`);

            const data = await response.json();
            setAdapters(Array.isArray(data.adapters) ? data.adapters : []);
            setLoadedAt(new Date());
        } catch (err: any) {
            setError(err?.message ?? String(err));
        } finally {
            window.clearTimeout(timeout);
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadSources(false);
    }, [loadSources]);

    const { initialSources, expandedSources, stateCoverage, totals } = useMemo(() => {
        const hydrated = adapters.map((adapter) => ({
            ...adapter,
            lastFeatureCount: countsBySource.get(adapter.id) ?? adapter.lastFeatureCount,
            healthy: adapter.healthy || (countsBySource.get(adapter.id) ?? 0) > 0,
        }));
        const initial = hydrated.filter((adapter) => adapter.priority === "initial").sort(sourceSort);
        const expanded = hydrated.filter((adapter) => adapter.priority !== "initial").sort(sourceSort);
        const metadataTotal = hydrated.reduce((sum, adapter) => sum + (adapter.lastFeatureCount ?? 0), 0);
        const totalCameras = cameraEntityCount || metadataTotal;
        const liveSources = hydrated.filter((adapter) => (adapter.lastFeatureCount ?? 0) > 0).length;
        const keySources = hydrated.filter((adapter) => !!adapter.requiresKey).length;
        const countsByState = new Map<string, number>();
        const keyStates = new Set<string>();
        const readyStates = new Set<string>();

        for (const adapter of hydrated) {
            if (!adapter.state) continue;
            if (adapter.requiresKey && adapter.lastFeatureCount === null) keyStates.add(adapter.state);
            if (!adapter.requiresKey) readyStates.add(adapter.state);
            countsByState.set(adapter.state, (countsByState.get(adapter.state) ?? 0) + (adapter.lastFeatureCount ?? 0));
        }

        return {
            initialSources: initial,
            expandedSources: expanded,
            stateCoverage: US_STATE_CODES.map((state) => ({
                state,
                count: countsByState.get(state) ?? 0,
                keyed: keyStates.has(state),
                ready: readyStates.has(state),
            })),
            totals: { totalCameras, liveSources, keySources },
        };
    }, [adapters, cameraEntityCount, countsBySource]);

    const enableCameraLayer = async () => {
        const state = useStore.getState();
        state.initLayer("camera", true);
        state.setLayerEnabled("camera", true);
        state.setHighlightLayerId("camera");
        state.setSelectedEntity(null);
        state.setConfigPanelOpen(true);
        state.setActiveConfigTab("intel");

        await pluginManager.enablePlugin("camera");
        await loadSources(false);
        trackEvent("camera-layer-load", { source: "camera-sources-panel" });
    };

    return (
        <div className="camera-sources">
            <div className="camera-sources__header">
                <div>
                    <div className="camera-sources__title">
                        <Camera size={15} />
                        <span>Public Camera Sources</span>
                    </div>
                    <div className="camera-sources__subtitle">
                        {loadedAt ? loadedAt.toLocaleTimeString() : cameraEntityCount > 0 ? "store live" : "standby"}
                    </div>
                </div>
                <button
                    type="button"
                    className="camera-sources__icon-btn"
                    title="Refresh sources"
                    onClick={() => { void loadSources(false); }}
                    disabled={loading}
                >
                    <RefreshCw size={15} className={loading ? "camera-sources__spin" : undefined} />
                </button>
            </div>

            <div className="camera-sources__stats">
                <div>
                    <span>{totals.totalCameras.toLocaleString()}</span>
                    <small>cameras</small>
                </div>
                <div>
                    <span>{totals.liveSources.toLocaleString()}</span>
                    <small>live sources</small>
                </div>
                <div>
                    <span>{totals.keySources.toLocaleString()}</span>
                    <small>keyed</small>
                </div>
            </div>

            <button
                type="button"
                className={`camera-sources__load-btn ${cameraEnabled ? "camera-sources__load-btn--active" : ""}`}
                onClick={() => { void enableCameraLayer(); }}
                disabled={loading}
            >
                <Power size={14} />
                <span>{cameraEnabled ? `${cameraEntityCount.toLocaleString()} cameras loaded` : "Load public camera layer"}</span>
            </button>

            {error && (
                <div className="camera-sources__error">
                    <AlertTriangle size={14} />
                    <span>{error}</span>
                </div>
            )}

            <div className="camera-sources__section">
                <div className="camera-sources__section-title">Initial Priority</div>
                <div className="camera-sources__rows">
                    {initialSources.map((adapter) => (
                        <SourceRow key={adapter.id} adapter={adapter} loading={loading} />
                    ))}
                </div>
            </div>

            <div className="camera-sources__section">
                <div className="camera-sources__section-title">State Coverage</div>
                <div className="camera-sources__state-grid">
                    {stateCoverage.map((item) => {
                        const status = item.count > 0 ? "active" : item.keyed ? "key" : item.ready ? "ready" : "queued";
                        return (
                            <div
                                key={item.state}
                                className={`camera-sources__state camera-sources__state--${status}`}
                                title={`${item.state}: ${item.count > 0 ? `${item.count.toLocaleString()} cameras` : item.keyed ? "API key required" : item.ready ? "Ready" : "Queued"}`}
                            >
                                <span>{item.state}</span>
                                <small>{item.count > 0 ? item.count.toLocaleString() : item.keyed ? "key" : item.ready ? "ready" : "queued"}</small>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="camera-sources__section">
                <div className="camera-sources__section-title">Expanded Coverage</div>
                <div className="camera-sources__rows">
                    {expandedSources.map((adapter) => (
                        <SourceRow key={adapter.id} adapter={adapter} loading={loading} />
                    ))}
                </div>
            </div>
        </div>
    );
}
