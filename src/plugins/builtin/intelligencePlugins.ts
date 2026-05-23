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

export const SAMPLE_INTELLIGENCE_PLUGIN_ID = "sample-intelligence";

export const DEFAULT_VISIBLE_PLUGIN_IDS = [SAMPLE_INTELLIGENCE_PLUGIN_ID] as const;

const BUILT_IN_PLUGIN_IDS = [
    SAMPLE_INTELLIGENCE_PLUGIN_ID,
    "aviation",
    "maritime",
    "earthquake",
    "wildfire",
    "camera",
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
    return mapFeatureCollection({ features: cameras }, "camera", maxEntities);
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
        description: "Traffic and public camera metadata from enabled adapters.",
        endpoint: "/api/camera/traffic?sources=all",
        icon: "Camera",
        category: "infrastructure",
        color: "#a855f7",
        intervalMs: 300_000,
        pointSize: 10,
        maxEntities: 2000,
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
    ];

    for (const plugin of plugins) {
        if (!pluginRegistry.has(plugin.id)) {
            pluginRegistry.register(plugin);
        }
    }
}
