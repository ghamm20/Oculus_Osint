import { NextResponse } from "next/server";

export const revalidate = 60;
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
    return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function getString(value: unknown): string | undefined {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return undefined;
}

function getNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

function incidentArray(payload: unknown): unknown[] {
    if (Array.isArray(payload)) return payload;
    const root = record(payload);
    if (Array.isArray(root.features)) return root.features;
    for (const key of ["incidents", "events", "items", "data", "results", "records"]) {
        if (Array.isArray(root[key])) return root[key] as unknown[];
    }
    return [];
}

function coordinates(item: JsonRecord): [number, number] | null {
    const geometry = record(item.geometry);
    const coords = geometry.type === "Point" && Array.isArray(geometry.coordinates)
        ? geometry.coordinates
        : null;

    if (coords) {
        const lon = getNumber(coords[0]);
        const lat = getNumber(coords[1]);
        if (lat !== undefined && lon !== undefined) return [lon, lat];
    }

    const properties = record(item.properties);
    const location = record(item.location ?? properties.location);
    const point = record(item.point ?? properties.point);

    const lat = getNumber(item.latitude)
        ?? getNumber(item.lat)
        ?? getNumber(properties.latitude)
        ?? getNumber(properties.lat)
        ?? getNumber(location.latitude)
        ?? getNumber(location.lat)
        ?? getNumber(point.latitude)
        ?? getNumber(point.lat);
    const lon = getNumber(item.longitude)
        ?? getNumber(item.lon)
        ?? getNumber(item.lng)
        ?? getNumber(properties.longitude)
        ?? getNumber(properties.lon)
        ?? getNumber(properties.lng)
        ?? getNumber(location.longitude)
        ?? getNumber(location.lon)
        ?? getNumber(location.lng)
        ?? getNumber(point.longitude)
        ?? getNumber(point.lon)
        ?? getNumber(point.lng);

    return lat !== undefined && lon !== undefined ? [lon, lat] : null;
}

function normalizeFeature(item: unknown, index: number) {
    const root = record(item);
    const properties = { ...record(root.properties), ...root };
    delete properties.geometry;

    const coords = coordinates(root);
    if (!coords) return null;

    const id = getString(properties.id)
        ?? getString(properties.incidentId)
        ?? getString(properties.uuid)
        ?? `citizen-${index}`;
    const name = getString(properties.title)
        ?? getString(properties.name)
        ?? getString(properties.type)
        ?? "Citizen incident";

    return {
        type: "Feature",
        properties: {
            ...properties,
            id,
            name,
            pluginId: "citizen",
            source: "Citizen authorized feed",
            time: properties.time ?? properties.timestamp ?? properties.createdAt ?? properties.reportedAt,
        },
        geometry: { type: "Point", coordinates: coords },
    };
}

export async function GET() {
    const url = process.env.CITIZEN_API_URL;
    if (!url) {
        return NextResponse.json({
            type: "FeatureCollection",
            features: [],
            metadata: {
                count: 0,
                status: "not_configured",
                note: "Set CITIZEN_API_URL and, if required, CITIZEN_API_KEY to load an authorized Citizen/incident export.",
            },
        });
    }

    try {
        const headers: Record<string, string> = {
            Accept: "application/json",
            "User-Agent": "Oculus0Osint/1.0",
        };
        if (process.env.CITIZEN_API_KEY) {
            headers.Authorization = `Bearer ${process.env.CITIZEN_API_KEY}`;
            headers["x-api-key"] = process.env.CITIZEN_API_KEY;
        }

        const response = await fetch(url, { headers, cache: "no-store" });
        if (!response.ok) {
            return NextResponse.json(
                { error: `Citizen authorized feed returned ${response.status}` },
                { status: 502 },
            );
        }

        const payload = await response.json();
        const features = incidentArray(payload)
            .map(normalizeFeature)
            .filter((feature): feature is NonNullable<ReturnType<typeof normalizeFeature>> => !!feature);

        return NextResponse.json({
            type: "FeatureCollection",
            features,
            metadata: {
                count: features.length,
                source: url,
                status: "ok",
                refreshedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("[CitizenRoute] Error:", error);
        return NextResponse.json({ error: "Failed to fetch Citizen authorized feed" }, { status: 502 });
    }
}
