/**
 * Fetches Florida 511 cameras when FL511_API_KEY is configured.
 *
 * Source: https://fl511.com/api/v2/get/cameras
 */

import type { GdotCameraFeature } from "../gdot/gdotFetcher";

const FL511_CAMERAS_URL = "https://fl511.com/api/v2/get/cameras";

interface Fl511Camera {
    Id?: string | number;
    SourceId?: string;
    Source?: string;
    Roadway?: string;
    Direction?: string;
    Latitude?: number | string;
    Longitude?: number | string;
    Name?: string;
    Description?: string;
    Url?: string;
    VideoUrl?: string;
    ImageUrl?: string;
    Disabled?: boolean;
    Blocked?: boolean;
}

function asArray(payload: unknown): Fl511Camera[] {
    if (Array.isArray(payload)) return payload as Fl511Camera[];
    if (payload && typeof payload === "object") {
        const record = payload as Record<string, unknown>;
        for (const key of ["cameras", "Cameras", "results", "data", "items", "value"]) {
            if (Array.isArray(record[key])) return record[key] as Fl511Camera[];
        }
    }
    return [];
}

function toGeoJsonFeature(c: Fl511Camera): GdotCameraFeature | null {
    if (c.Disabled || c.Blocked) return null;

    const lat = typeof c.Latitude === "number" ? c.Latitude : Number(c.Latitude);
    const lon = typeof c.Longitude === "number" ? c.Longitude : Number(c.Longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    const hls = c.VideoUrl ?? null;
    const stream = hls || c.ImageUrl || c.Url || "";

    // Fix B — drop entities with no usable stream URL.
    if (!stream) return null;

    return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: {
            stream,
            hls,
            country: "United States",
            region: "Florida",
            city: "Florida",
            source: "fl511",
            name: String(c.Id ?? c.SourceId ?? c.Name ?? ""),
            route: c.Roadway ?? "",
            direction: c.Direction ?? "",
            location_description: c.Description ?? c.Name ?? c.Roadway ?? "",
            categories: ["traffic", "dot", "florida"],
            extra: {
                upstreamSource: c.Source,
                sourceId: c.SourceId,
            },
        },
    };
}

export async function fetchFl511Cameras(): Promise<GdotCameraFeature[]> {
    const key = process.env.FL511_API_KEY;
    if (!key) return [];

    const params = new URLSearchParams({ key, format: "json" });
    const res = await fetch(`${FL511_CAMERAS_URL}?${params}`, {
        headers: { "User-Agent": "Oculus0Osint/1.0", Accept: "application/json" },
        next: { revalidate: 300 },
    });

    if (!res.ok) throw new Error(`FL511 API returned ${res.status}`);

    const data = asArray(await res.json());
    const cameras: GdotCameraFeature[] = [];
    for (const item of data) {
        const feature = toGeoJsonFeature(item);
        if (feature) cameras.push(feature);
    }

    // Fix B — surface adapter-level filtering count.
    const skipped = data.length - cameras.length;
    if (skipped > 0) {
        console.info(
            `[fl511] skipped ${skipped} of ${data.length} upstream rows (disabled / blocked / no stream URL)`,
        );
    }

    return cameras;
}
