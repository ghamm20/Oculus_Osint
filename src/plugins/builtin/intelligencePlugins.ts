"use client";

import type {
    CesiumEntityOptions,
    GeoEntity,
    LayerConfig,
    PluginCategory,
    PluginContext,
    TimeRange,
    WorldPlugin,
} from "@/core/plugins/PluginTypes";
import { pluginRegistry } from "@/core/plugins/PluginRegistry";
import { CitizenIncidentDetail } from "./CitizenIncidentDetail";
import { FlockObservationDetail } from "./FlockObservationDetail";

export const SAMPLE_INTELLIGENCE_PLUGIN_ID = "sample-intelligence";

export const DEFAULT_VISIBLE_PLUGIN_IDS = [SAMPLE_INTELLIGENCE_PLUGIN_ID] as const;

const BUILT_IN_PLUGIN_IDS = [
    SAMPLE_INTELLIGENCE_PLUGIN_ID,
    "aviation",
    "maritime",
    "earthquake",
    "wildfire",
    "camera",
    "weather-camera",
    "satellite",
    "citizen",
    "flock",
] as const;

const SAMPLE_ENTITIES: Array<Omit<GeoEntity, "timestamp">> = [
    {
        id: "sample-suez-canal-watch",
        pluginId: SAMPLE_INTELLIGENCE_PLUGIN_ID,
        latitude: 30.0444,
        longitude: 31.2357,
        label: "Suez Canal Watch",
        properties: {
            domain: "maritime",
            priority: "watch",
            summary: "Verification marker for a strategic transit corridor.",
        },
    },
    {
        id: "sample-med-air-corridor",
        pluginId: SAMPLE_INTELLIGENCE_PLUGIN_ID,
        latitude: 35.2,
        longitude: 18.6,
        altitude: 9500,
        heading: 92,
        label: "Mediterranean Air Corridor",
        properties: {
            domain: "aviation",
            priority: "monitor",
            summary: "Representative aircraft movement marker.",
        },
    },
    {
        id: "sample-libya-energy-node",
        pluginId: SAMPLE_INTELLIGENCE_PLUGIN_ID,
        latitude: 32.8872,
        longitude: 13.1913,
        label: "Tripoli Energy Node",
        properties: {
            domain: "infrastructure",
            priority: "review",
            summary: "Infrastructure marker used to verify layer rendering.",
        },
    },
    {
        id: "sample-turkey-seismic-alert",
        pluginId: SAMPLE_INTELLIGENCE_PLUGIN_ID,
        latitude: 37.0662,
        longitude: 37.3833,
        label: "Turkey Seismic Alert",
        properties: {
            domain: "natural-disaster",
            priority: "alert",
            summary: "Representative seismic event marker.",
        },
    },
    {
        id: "sample-greece-fire-watch",
        pluginId: SAMPLE_INTELLIGENCE_PLUGIN_ID,
        latitude: 38.0,
        longitude: 23.5,
        label: "Greece Fire Watch",
        properties: {
            domain: "wildfire",
            priority: "watch",
            summary: "Representative wildfire marker.",
        },
    },
    {
        id: "sample-red-sea-maritime",
        pluginId: SAMPLE_INTELLIGENCE_PLUGIN_ID,
        latitude: 19.0,
        longitude: 39.2,
        heading: 334,
        label: "Red Sea Maritime Track",
        properties: {
            domain: "maritime",
            priority: "monitor",
            summary: "Representative vessel movement marker.",
        },
    },
];

const CAMERA_SOURCE_COLORS: Record<string, string> = {
    caltrans: "#22d3ee",
    gdot: "#a3e635",
    ny511: "#60a5fa",
    tfl: "#f472b6",
    wsdot: "#f59e0b",
    "chart-md": "#fb7185",
    ohgo: "#2dd4bf",
    fl511: "#facc15",
    unknown: "#a855f7",
};

const SATELLITE_GROUP_COLORS: Record<string, string> = {
    stations: "#f8fafc",
    weather: "#38bdf8",
    resource: "#22c55e",
    science: "#a78bfa",
    geo: "#f59e0b",
    "gps-ops": "#34d399",
    galileo: "#60a5fa",
    beidou: "#f87171",
    visual: "#facc15",
    intelsat: "#fb923c",
    ses: "#c084fc",
    "iridium-next": "#67e8f9",
    oneweb: "#93c5fd",
    starlink: "#e5e7eb",
    unknown: "#94a3b8",
};

const CITIZEN_SEVERITY_COLORS: Record<string, string> = {
    critical: "#dc2626",
    high: "#ef4444",
    elevated: "#f97316",
    medium: "#f59e0b",
    low: "#facc15",
    unknown: "#f43f5e",
};

const FLOCK_COLORS = {
    observation: "#0ea5e9",
    alert: "#ef4444",
    masked: "#64748b",
};

type FeatureLike = {
    id?: string | number;
    geometry?: {
        type?: string;
        coordinates?: unknown;
    };
    properties?: Record<string, unknown>;
};

interface ApiPluginConfig {
    id: string;
    name: string;
    description: string;
    endpoint: string;
    icon: string;
    category: PluginCategory;
    color: string;
    intervalMs: number;
    pointSize: number;
    maxEntities?: number;
    showLabels?: boolean;
}

function getRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function getFiniteNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

function getString(value: unknown): string | undefined {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return undefined;
}

function getTimestamp(value: unknown): Date {
    const numeric = getFiniteNumber(value);
    if (numeric !== undefined) {
        return new Date(numeric < 10_000_000_000 ? numeric * 1000 : numeric);
    }

    const text = getString(value);
    if (text) {
        const parsed = Date.parse(text);
        if (Number.isFinite(parsed)) return new Date(parsed);
    }

    return new Date();
}

function getFeatureCoordinates(feature: FeatureLike): [number, number, number | undefined] | null {
    if (feature.geometry?.type && feature.geometry.type !== "Point") return null;
    const coordinates = feature.geometry?.coordinates;
    if (!Array.isArray(coordinates)) return null;

    const lon = getFiniteNumber(coordinates[0]);
    const lat = getFiniteNumber(coordinates[1]);
    const altitude = getFiniteNumber(coordinates[2]);

    if (lat === undefined || lon === undefined) return null;
    return [lon, lat, altitude];
}

function mapFeatureCollection(data: unknown, pluginId: string, maxEntities?: number): GeoEntity[] {
    const payload = getRecord(data);
    const features = Array.isArray(payload.features) ? payload.features as FeatureLike[] : [];
    const entities: GeoEntity[] = [];

    for (let index = 0; index < features.length; index += 1) {
        const feature = features[index];
        const coordinates = getFeatureCoordinates(feature);
        if (!coordinates) continue;

        const [longitude, latitude, altitude] = coordinates;
        const properties = getRecord(feature.properties);
        const rawId = getString(properties.id) ?? getString(feature.id) ?? `${pluginId}-${index}`;
        const label = getString(properties.name)
            ?? getString(properties.title)
            ?? getString(properties.place)
            ?? rawId;

        entities.push({
            id: `${pluginId}-${rawId}`,
            pluginId,
            latitude,
            longitude,
            altitude,
            heading: getFiniteNumber(properties.heading),
            speed: getFiniteNumber(properties.speed) ?? getFiniteNumber(properties.velocity),
            timestamp: getTimestamp(properties.time ?? properties.timestamp ?? properties.lastContact),
            label,
            properties: {
                ...properties,
                sourcePlugin: pluginId,
            },
        });

        if (maxEntities && entities.length >= maxEntities) break;
    }

    return entities;
}

function mapCameraPayload(data: unknown, maxEntities?: number): GeoEntity[] {
    const payload = getRecord(data);
    const cameras = Array.isArray(payload.cameras) ? payload.cameras as FeatureLike[] : [];
    const entities: GeoEntity[] = [];

    for (let index = 0; index < cameras.length; index += 1) {
        const feature = cameras[index];
        const coordinates = getFeatureCoordinates(feature);
        if (!coordinates) continue;

        const [longitude, latitude, altitude] = coordinates;
        const properties = getRecord(feature.properties);
        const source = (getString(properties.source) ?? "unknown").toLowerCase();
        const name = getString(properties.name);
        const route = getString(properties.route);
        const direction = getString(properties.direction);
        const location = getString(properties.location_description);
        const rawId = getString(properties.id)
            ?? getString(feature.id)
            ?? [name, route, direction, location, latitude.toFixed(5), longitude.toFixed(5)]
                .filter(Boolean)
                .join("-")
                .replace(/[^a-zA-Z0-9._-]+/g, "-")
            ?? `camera-${index}`;
        const label = [source.toUpperCase(), route || name || location || "Traffic camera"]
            .filter(Boolean)
            .join(" - ");

        entities.push({
            id: `camera-${source}-${rawId}-${index}`,
            pluginId: "camera",
            latitude,
            longitude,
            altitude,
            heading: getFiniteNumber(properties.heading),
            timestamp: getTimestamp(properties.time ?? properties.timestamp ?? properties.lastFetchedAt),
            label,
            properties: {
                ...properties,
                source,
                sourcePlugin: "camera",
            },
        });

        if (maxEntities && entities.length >= maxEntities) break;
    }

    return entities;
}

function createLayerConfig(color: string, maxEntities?: number): LayerConfig {
    return {
        color,
        clusterEnabled: false,
        clusterDistance: 0,
        maxEntities,
    };
}

function renderPoint(entity: GeoEntity, color: string, pointSize: number, showLabel = false): CesiumEntityOptions {
    return {
        type: "point",
        color,
        size: pointSize,
        outlineColor: "#020617",
        outlineWidth: 2,
        labelText: showLabel ? entity.label : undefined,
        labelFont: "12px Inter, sans-serif",
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        disableClustering: true,
    };
}

function createSamplePlugin(): WorldPlugin {
    return {
        id: SAMPLE_INTELLIGENCE_PLUGIN_ID,
        name: "Sample Intelligence",
        description: "Verification layer with visible OSINT markers.",
        icon: "Radar",
        category: "intelligence",
        version: "1.0.0",
        async initialize() {},
        destroy() {},
        async fetch() {
            const timestamp = new Date();
            return SAMPLE_ENTITIES.map((entity) => ({
                ...entity,
                timestamp,
            }));
        },
        getPollingInterval() {
            return 0;
        },
        getLayerConfig() {
            return {
                color: "#f59e0b",
                clusterEnabled: false,
                clusterDistance: 0,
                maxEntities: SAMPLE_ENTITIES.length,
            };
        },
        renderEntity(entity) {
            const domain = getString(entity.properties.domain);
            const color = domain === "wildfire"
                ? "#ef4444"
                : domain === "natural-disaster"
                    ? "#f97316"
                    : domain === "aviation"
                        ? "#38bdf8"
                        : domain === "infrastructure"
                            ? "#a855f7"
                            : "#f59e0b";

            return {
                ...renderPoint(entity, color, 18, true),
                disableClustering: true,
            };
        },
        getLegend() {
            return [
                { label: "Aviation", color: "#38bdf8" },
                { label: "Maritime", color: "#f59e0b" },
                { label: "Infrastructure", color: "#a855f7" },
                { label: "Natural Hazard", color: "#ef4444" },
            ];
        },
    };
}

function createGeoJsonApiPlugin(config: ApiPluginConfig): WorldPlugin {
    let context: PluginContext | null = null;

    return {
        id: config.id,
        name: config.name,
        description: config.description,
        icon: config.icon,
        category: config.category,
        version: "1.0.0",
        async initialize(ctx) {
            context = ctx;
        },
        destroy() {
            context = null;
        },
        async fetch(_timeRange: TimeRange) {
            const response = await fetch(config.endpoint, {
                headers: { Accept: "application/json" },
            });

            if (!response.ok) {
                throw new Error(`${config.name} returned ${response.status}`);
            }

            const data = await response.json();
            return mapFeatureCollection(data, config.id, config.maxEntities);
        },
        getPollingInterval() {
            return config.intervalMs;
        },
        getLayerConfig() {
            return createLayerConfig(config.color, config.maxEntities);
        },
        renderEntity(entity) {
            return renderPoint(entity, config.color, config.pointSize, config.showLabels);
        },
        getServerConfig() {
            return {
                apiBasePath: config.endpoint,
                pollingIntervalMs: config.intervalMs,
                historyEnabled: context?.edition !== "demo",
                availabilityEnabled: true,
            };
        },
    };
}

function createCameraPlugin(): WorldPlugin {
    const config: ApiPluginConfig = {
        id: "camera",
        name: "Public Cameras",
        description: "All DOT and public traffic cameras from enabled adapters.",
        endpoint: "/api/camera/traffic?sources=all",
        icon: "Camera",
        category: "infrastructure",
        color: "#a855f7",
        intervalMs: 300_000,
        pointSize: 7,
    };

    return {
        ...createGeoJsonApiPlugin(config),
        async fetch() {
            const response = await fetch(config.endpoint, {
                headers: { Accept: "application/json" },
            });

            if (!response.ok) {
                throw new Error(`${config.name} returned ${response.status}`);
            }

            const data = await response.json();
            return mapCameraPayload(data, config.maxEntities);
        },
        renderEntity(entity) {
            const source = getString(entity.properties.source)?.toLowerCase() ?? "unknown";
            return renderPoint(entity, CAMERA_SOURCE_COLORS[source] ?? CAMERA_SOURCE_COLORS.unknown, config.pointSize, false);
        },
        getLegend() {
            return [
                { label: "Caltrans", color: CAMERA_SOURCE_COLORS.caltrans },
                { label: "GDOT", color: CAMERA_SOURCE_COLORS.gdot },
                { label: "Maryland CHART", color: CAMERA_SOURCE_COLORS["chart-md"] },
                { label: "511NY", color: CAMERA_SOURCE_COLORS.ny511 },
                { label: "TfL", color: CAMERA_SOURCE_COLORS.tfl },
                { label: "WSDOT", color: CAMERA_SOURCE_COLORS.wsdot },
                { label: "OHGO", color: CAMERA_SOURCE_COLORS.ohgo },
                { label: "FL511", color: CAMERA_SOURCE_COLORS.fl511 },
            ];
        },
    };
}

export function isBuiltInIntelligencePlugin(pluginId: string): boolean {
    return (BUILT_IN_PLUGIN_IDS as readonly string[]).includes(pluginId);
}

export function registerBuiltInIntelligencePlugins(): void {
    const plugins: WorldPlugin[] = [
        createSamplePlugin(),
        createGeoJsonApiPlugin({
            id: "aviation",
            name: "Live Aviation",
            description: "OpenSky aircraft positions via local API proxy.",
            endpoint: "/api/aviation",
            icon: "Plane",
            category: "aviation",
            color: "#38bdf8",
            intervalMs: 30_000,
            pointSize: 8,
            maxEntities: 2000,
        }),
        createGeoJsonApiPlugin({
            id: "maritime",
            name: "Maritime Vessels",
            description: "AIS-style vessel layer from the maritime endpoint.",
            endpoint: "/api/maritime",
            icon: "Ship",
            category: "maritime",
            color: "#22c55e",
            intervalMs: 300_000,
            pointSize: 11,
            showLabels: true,
        }),
        createGeoJsonApiPlugin({
            id: "earthquake",
            name: "Earthquakes",
            description: "USGS all-day seismic feed.",
            endpoint: "/api/earthquake",
            icon: "Activity",
            category: "natural-disaster",
            color: "#f97316",
            intervalMs: 120_000,
            pointSize: 10,
            maxEntities: 1000,
        }),
        createGeoJsonApiPlugin({
            id: "wildfire",
            name: "Wildfires",
            description: "Wildfire hotspots from the local wildfire endpoint.",
            endpoint: "/api/wildfire",
            icon: "Flame",
            category: "natural-disaster",
            color: "#ef4444",
            intervalMs: 300_000,
            pointSize: 12,
            showLabels: true,
        }),
        createCameraPlugin(),
        {
            ...createGeoJsonApiPlugin({
                id: "weather-camera",
                name: "Weather Cameras",
                description: "FAA aviation weather cameras across public sites.",
                endpoint: "/api/weather-cameras",
                icon: "CloudSun",
                category: "infrastructure",
                color: "#0ea5e9",
                intervalMs: 300_000,
                pointSize: 7,
                maxEntities: 4000,
            }),
            renderEntity(entity) {
                const thirdParty = entity.properties.thirdParty === true;
                return renderPoint(entity, thirdParty ? "#8b5cf6" : "#0ea5e9", 7, false);
            },
            getLegend() {
                return [
                    { label: "FAA owned", color: "#0ea5e9" },
                    { label: "Third-party partner", color: "#8b5cf6" },
                ];
            },
        },
        {
            ...createGeoJsonApiPlugin({
                id: "satellite",
                name: "Satellite Feeds",
                description: "Live CelesTrak GP satellite positions propagated locally.",
                endpoint: "/api/satellite",
                icon: "Satellite",
                category: "space",
                color: "#38bdf8",
                intervalMs: 60_000,
                pointSize: 8,
                maxEntities: 3000,
            }),
            renderEntity(entity) {
                const group = getString(entity.properties.group)?.toLowerCase() ?? "unknown";
                return {
                    ...renderPoint(entity, SATELLITE_GROUP_COLORS[group] ?? SATELLITE_GROUP_COLORS.unknown, 8, false),
                    disableManualHorizonCulling: true,
                };
            },
            getLegend() {
                return [
                    { label: "Stations", color: SATELLITE_GROUP_COLORS.stations },
                    { label: "Weather", color: SATELLITE_GROUP_COLORS.weather },
                    { label: "Science", color: SATELLITE_GROUP_COLORS.science },
                    { label: "GEO", color: SATELLITE_GROUP_COLORS.geo },
                    { label: "Navigation", color: SATELLITE_GROUP_COLORS["gps-ops"] },
                    { label: "Communications", color: SATELLITE_GROUP_COLORS.oneweb },
                ];
            },
            getSelectionBehavior() {
                return {
                    showTrail: true,
                    flyToBaseDistance: 2_500_000,
                };
            },
        },
        {
            ...createGeoJsonApiPlugin({
                id: "citizen",
                name: "Citizen Authorized Feed",
                description: "User-configured authorized Citizen or incident export.",
                endpoint: "/api/citizen",
                icon: "Siren",
                category: "intelligence",
                color: "#f43f5e",
                intervalMs: 60_000,
                pointSize: 11,
                maxEntities: 3000,
            }),
            renderEntity(entity) {
                const severity = getString(entity.properties.severity)
                    ?? getString(entity.properties.priority)
                    ?? getString(entity.properties.level)
                    ?? "unknown";
                return renderPoint(entity, CITIZEN_SEVERITY_COLORS[severity.toLowerCase()] ?? CITIZEN_SEVERITY_COLORS.unknown, 11, true);
            },
            getLegend() {
                return [
                    { label: "Critical", color: CITIZEN_SEVERITY_COLORS.critical },
                    { label: "High", color: CITIZEN_SEVERITY_COLORS.high },
                    { label: "Elevated", color: CITIZEN_SEVERITY_COLORS.elevated },
                    { label: "Low", color: CITIZEN_SEVERITY_COLORS.low },
                ];
            },
            getDetailComponent() {
                return CitizenIncidentDetail;
            },
        },
        {
            ...createGeoJsonApiPlugin({
                id: "flock",
                name: "Flock Authorized Feed",
                description: "Authorized ALPR observations and alerts from configured Flock exports.",
                endpoint: "/api/flock",
                icon: "ScanLine",
                category: "intelligence",
                color: FLOCK_COLORS.observation,
                intervalMs: 60_000,
                pointSize: 10,
                maxEntities: 5000,
            }),
            renderEntity(entity) {
                const isAlert = entity.properties.hotlistHit === true;
                return renderPoint(entity, isAlert ? FLOCK_COLORS.alert : FLOCK_COLORS.observation, isAlert ? 13 : 10, false);
            },
            getLegend() {
                return [
                    { label: "ALPR observation", color: FLOCK_COLORS.observation },
                    { label: "ALPR alert", color: FLOCK_COLORS.alert },
                    { label: "Masked plate", color: FLOCK_COLORS.masked },
                ];
            },
            getDetailComponent() {
                return FlockObservationDetail;
            },
        },
    ];

    for (const plugin of plugins) {
        if (!pluginRegistry.has(plugin.id)) {
            pluginRegistry.register(plugin);
        }
    }
}
