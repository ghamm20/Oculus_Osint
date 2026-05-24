/**
 * Fetches Tennessee SmartWay public traffic cameras.
 *
 * SmartWay publishes its API base URL, public API key, and endpoint names in
 * https://smartway.tn.gov/config/config.prod.json. This fetcher reads that
 * public config first, then calls the configured RoadwayCameras endpoint.
 */

import type { CameraFeature } from "../adapters/types";

const SMARTWAY_CONFIG_URL = "https://smartway.tn.gov/config/config.prod.json";

interface SmartWayConfig {
    apiBaseUrl?: string;
    apiKey?: string;
    cameras?: string;
}

interface SmartWayCamera {
    id?: string | number;
    title?: string;
    description?: string;
    thumbnailUrl?: string;
    httpVideoUrl?: string;
    httpsVideoUrl?: string;
    active?: string | boolean;
    jurisdiction?: string;
    route?: string;
    mileMarker?: string | number;
    lat?: number | string;
    lng?: number | string;
    location?: {
        coordinates?: Array<{ lat?: number | string; lng?: number | string }>;
    };
}

function getString(value: unknown): string {
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return "";
}

function getNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

async function fetchSmartWayConfig(): Promise<Required<Pick<SmartWayConfig, "apiBaseUrl" | "apiKey" | "cameras">>> {
    const res = await fetch(SMARTWAY_CONFIG_URL, {
        headers: {
            "User-Agent": "Oculus0Osint/1.0",
            Accept: "application/json",
        },
        next: { revalidate: 3600 },
    });

    if (!res.ok) throw new Error(`TDOT SmartWay config returned ${res.status}`);

    const config = await res.json() as SmartWayConfig;
    if (!config.apiBaseUrl || !config.apiKey || !config.cameras) {
        throw new Error("TDOT SmartWay config is missing camera API fields");
    }

    return {
        apiBaseUrl: config.apiBaseUrl,
        apiKey: config.apiKey,
        cameras: config.cameras,
    };
}

function toGeoJsonFeature(camera: SmartWayCamera): CameraFeature | null {
    const location = camera.location?.coordinates?.[0];
    const lat = getNumber(camera.lat) ?? getNumber(location?.lat);
    const lon = getNumber(camera.lng) ?? getNumber(location?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    const active = typeof camera.active === "boolean"
        ? camera.active
        : getString(camera.active).toLowerCase() !== "false";

    if (!active) return null;

    const hls = getString(camera.httpsVideoUrl) || getString(camera.httpVideoUrl) || null;
    const thumbnail = getString(camera.thumbnailUrl);
    const stream = hls || thumbnail || null;
    const jurisdiction = getString(camera.jurisdiction);
    const route = getString(camera.route);
    const mileMarker = getString(camera.mileMarker);
    const id = getString(camera.id);
    const title = getString(camera.title);
    const description = getString(camera.description);

    return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon as number, lat as number] },
        properties: {
            id,
            stream,
            hls,
            streamType: hls ? "hls" : (thumbnail ? "image" : null),
            country: "United States",
            region: jurisdiction ? `${jurisdiction}, Tennessee` : "Tennessee",
            city: jurisdiction || "Tennessee",
            source: "tn-smartway",
            name: id || title,
            route,
            direction: "",
            location_description: description || title || [route, mileMarker && `MM ${mileMarker}`].filter(Boolean).join(" "),
            categories: ["traffic", "dot", "tennessee"],
            extra: {
                mileMarker,
                jurisdiction,
                thumbnailUrl: thumbnail,
                sourceConfig: SMARTWAY_CONFIG_URL,
            },
        },
    };
}

export async function fetchTnSmartWayCameras(): Promise<CameraFeature[]> {
    const config = await fetchSmartWayConfig();
    const endpoint = new URL(config.cameras, config.apiBaseUrl).toString();
    const res = await fetch(endpoint, {
        headers: {
            "User-Agent": "Oculus0Osint/1.0",
            Accept: "application/json",
            ApiKey: config.apiKey,
        },
        next: { revalidate: 300 },
    });

    if (!res.ok) throw new Error(`TDOT SmartWay camera API returned ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const cameras: CameraFeature[] = [];
    for (const item of data) {
        const feature = toGeoJsonFeature(item as SmartWayCamera);
        if (feature) cameras.push(feature);
    }

    return cameras;
}
