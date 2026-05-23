/**
 * Fetches Maryland CHART live traffic cameras.
 *
 * Source: https://chart.maryland.gov/DataFeeds/GetCamerasJSON
 * Public, no authentication required.
 */

import type { GdotCameraFeature } from "../gdot/gdotFetcher";

const CHART_CAMERAS_URL = "https://chart.maryland.gov/DataFeeds/GetCamerasJSON";

interface ChartCamera {
    cameraCategories?: string[];
    commMode?: string;
    description?: string;
    id?: string;
    lastCachedDataUpdateTime?: number | string;
    lat?: number | string;
    lon?: number | string;
    name?: string;
    opStatus?: string;
    publicVideoURL?: string;
    routeNumber?: string | number;
    routePrefix?: string;
    routeSuffix?: string;
}

function toTimestamp(value: number | string | undefined): string | undefined {
    if (typeof value === "number" && Number.isFinite(value)) {
        return new Date(value < 10_000_000_000 ? value * 1000 : value).toISOString();
    }

    if (typeof value === "string" && value.trim()) {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) return toTimestamp(numeric);

        const parsed = Date.parse(value);
        if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
    }

    return undefined;
}

function routeName(c: ChartCamera): string {
    return [c.routePrefix, c.routeNumber, c.routeSuffix]
        .map((part) => String(part ?? "").trim())
        .filter(Boolean)
        .join(" ");
}

function toGeoJsonFeature(c: ChartCamera): GdotCameraFeature | null {
    const lat = typeof c.lat === "number" ? c.lat : Number(c.lat);
    const lon = typeof c.lon === "number" ? c.lon : Number(c.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    if (c.commMode && c.commMode !== "ONLINE") return null;
    if (c.opStatus && c.opStatus !== "OK") return null;

    const route = routeName(c);
    const categories = Array.isArray(c.cameraCategories) ? c.cameraCategories : [];

    return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: {
            stream: c.publicVideoURL ?? "",
            hls: null,
            country: "United States",
            region: categories.join(", ") || "Maryland",
            city: "Maryland",
            source: "chart-md",
            name: c.id ?? c.name ?? "",
            route,
            direction: "",
            location_description: c.description ?? c.name ?? route,
            categories: ["traffic", "dot", "maryland"],
            extra: {
                lastCachedDataUpdateTime: toTimestamp(c.lastCachedDataUpdateTime),
                opStatus: c.opStatus,
                commMode: c.commMode,
            },
        },
    };
}

export async function fetchChartCameras(): Promise<GdotCameraFeature[]> {
    const res = await fetch(CHART_CAMERAS_URL, {
        headers: { "User-Agent": "Oculus0Osint/1.0", Accept: "application/json" },
        next: { revalidate: 300 },
    });

    if (!res.ok) throw new Error(`Maryland CHART API returned ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const cameras: GdotCameraFeature[] = [];
    for (const item of data) {
        const feature = toGeoJsonFeature(item as ChartCamera);
        if (feature) cameras.push(feature);
    }

    return cameras;
}
