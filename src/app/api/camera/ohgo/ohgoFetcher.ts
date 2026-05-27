/**
 * Fetches Ohio OHGO cameras when OHGO_API_KEY is configured.
 *
 * Source: https://publicapi.ohgo.com/api/v1/cameras
 */

import type { GdotCameraFeature } from "../gdot/gdotFetcher";

const OHGO_CAMERAS_URL = "https://publicapi.ohgo.com/api/v1/cameras";

interface OhgoCameraView {
    Direction?: string;
    SmallUrl?: string;
    LargeUrl?: string;
    MainRoute?: string;
}

interface OhgoCamera {
    Id?: string;
    Latitude?: number | string;
    Longitude?: number | string;
    Location?: string;
    Description?: string;
    CameraViews?: OhgoCameraView[];
}

function asArray(payload: unknown): OhgoCamera[] {
    if (Array.isArray(payload)) return payload as OhgoCamera[];
    if (payload && typeof payload === "object") {
        const record = payload as Record<string, unknown>;
        for (const key of ["results", "data", "items", "cameras", "value"]) {
            if (Array.isArray(record[key])) return record[key] as OhgoCamera[];
        }
    }
    return [];
}

function toFeature(camera: OhgoCamera, view: OhgoCameraView, index: number): GdotCameraFeature | null {
    const lat = typeof camera.Latitude === "number" ? camera.Latitude : Number(camera.Latitude);
    const lon = typeof camera.Longitude === "number" ? camera.Longitude : Number(camera.Longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    const stream = view.LargeUrl || view.SmallUrl || "";
    const route = view.MainRoute || "";
    const direction = view.Direction || "";

    // Fix B — drop entities with no usable stream URL.
    if (!stream) return null;

    return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: {
            stream,
            hls: null,
            country: "United States",
            region: "Ohio",
            city: "Ohio",
            source: "ohgo",
            name: `${camera.Id ?? "ohgo"}-${index}`,
            route,
            direction,
            location_description: camera.Description || camera.Location || route,
            categories: ["traffic", "dot", "ohio"],
            extra: {
                cameraId: camera.Id,
                smallUrl: view.SmallUrl,
                largeUrl: view.LargeUrl,
            },
        },
    };
}

export async function fetchOhgoCameras(): Promise<GdotCameraFeature[]> {
    const key = process.env.OHGO_API_KEY;
    if (!key) return [];

    const url = `${OHGO_CAMERAS_URL}?api-key=${encodeURIComponent(key)}`;
    const res = await fetch(url, {
        headers: {
            "User-Agent": "Oculus0Osint/1.0",
            Accept: "application/json",
        },
        next: { revalidate: 300 },
    });

    if (!res.ok) throw new Error(`OHGO API returned ${res.status}`);

    const cameras = asArray(await res.json());
    const features: GdotCameraFeature[] = [];
    let upstreamViewCount = 0;

    for (const camera of cameras) {
        const views = Array.isArray(camera.CameraViews) && camera.CameraViews.length > 0
            ? camera.CameraViews
            : [{}];
        upstreamViewCount += views.length;
        views.forEach((view, index) => {
            const feature = toFeature(camera, view, index);
            if (feature) features.push(feature);
        });
    }

    // Fix B — surface adapter-level filtering count.
    const skipped = upstreamViewCount - features.length;
    if (skipped > 0) {
        console.info(
            `[ohgo] skipped ${skipped} of ${upstreamViewCount} upstream camera views (no stream URL / bad coords)`,
        );
    }

    return features;
}
