/**
 * Fetches Florida 511 traffic camera snapshots from FDOT's public ArcGIS layer.
 *
 * Source: FL511_Traffic_Cameras FeatureServer.
 * Public, no authentication required.
 */

import type { CameraFeature } from "../adapters/types";

const FL511_PUBLIC_QUERY_URL =
    "https://services.arcgis.com/3wFbqsFPLeKqOlIK/ArcGIS/rest/services" +
    "/FL511_Traffic_Cameras/FeatureServer/0/query";

const PAGE_SIZE = 2000;

interface ArcGisFeature {
    attributes?: Record<string, unknown>;
    geometry?: {
        x?: number;
        y?: number;
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

function parseFlTimestamp(value: unknown): string | undefined {
    const text = getString(value);
    if (!text) return undefined;

    const parsed = Date.parse(text);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
    return undefined;
}

function toGeoJsonFeature(raw: ArcGisFeature): CameraFeature | null {
    const a = raw.attributes ?? {};
    const lat = getNumber(a.LATITUDE) ?? raw.geometry?.y;
    const lon = getNumber(a.LONGITUDE) ?? raw.geometry?.x;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

    const id = getString(a.ID);
    const description = getString(a.DESCRIPT);
    const county = getString(a.COUNTY);
    const highway = getString(a.HIGHWAY);
    const direction = getString(a.DIRECTION);
    const image = getString(a.IMAGE);
    const timestamp = parseFlTimestamp(a.TIMESTAMP);

    return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon as number, lat as number] },
        properties: {
            id,
            stream: image || null,
            hls: null,
            streamType: image ? "image" : null,
            country: "United States",
            region: county ? `${county} County, Florida` : "Florida",
            city: county || "Florida",
            source: "fl511-public",
            name: id || description,
            route: highway,
            direction,
            location_description: description || [highway, direction].filter(Boolean).join(" "),
            timestamp,
            categories: ["traffic", "dot", "florida"],
            extra: {
                objectId: a.OBJECTID_1,
                county,
                upstreamTimestamp: getString(a.TIMESTAMP),
            },
        },
    };
}

export async function fetchFl511PublicCameras(): Promise<CameraFeature[]> {
    const all: CameraFeature[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        const params = new URLSearchParams({
            where: "1=1",
            outFields: "*",
            outSR: "4326",
            f: "json",
            resultRecordCount: String(PAGE_SIZE),
            resultOffset: String(offset),
        });

        const res = await fetch(`${FL511_PUBLIC_QUERY_URL}?${params}`, {
            headers: {
                "User-Agent": "Oculus0Osint/1.0",
                Accept: "application/json",
            },
            next: { revalidate: 300 },
        });

        if (!res.ok) throw new Error(`FL511 public ArcGIS API returned ${res.status}`);

        const json = await res.json();
        const features = Array.isArray(json.features) ? json.features as ArcGisFeature[] : [];

        for (const feature of features) {
            const converted = toGeoJsonFeature(feature);
            if (converted) all.push(converted);
        }

        hasMore = json.exceededTransferLimit === true && features.length > 0;
        offset += features.length;
    }

    return all;
}
