import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

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

function firstString(...values: unknown[]): string | undefined {
    for (const value of values) {
        const text = getString(value);
        if (text) return text;
    }
    return undefined;
}

function firstNumber(...values: unknown[]): number | undefined {
    for (const value of values) {
        const number = getNumber(value);
        if (number !== undefined) return number;
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

function parseFeedText(text: string): unknown {
    const normalized = text.replace(/^\uFEFF/, "").trim();
    if (!normalized) return [];

    try {
        return JSON.parse(normalized);
    } catch {
        const records = normalized
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => JSON.parse(line));
        return records;
    }
}

async function loadConfiguredPayload(): Promise<{ payload: unknown; source: string; sourceType: "url" | "file" } | null> {
    const url = process.env.CITIZEN_API_URL
        || (process.env.CITIZEN_API_BASE_URL
            ? new URL(process.env.CITIZEN_API_INCIDENTS_PATH || "/incidents", process.env.CITIZEN_API_BASE_URL).toString()
            : undefined);

    if (url) {
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
            throw new Error(`Citizen authorized feed returned ${response.status}`);
        }

        return { payload: await response.json(), source: url, sourceType: "url" };
    }

    const configuredFile = process.env.CITIZEN_FEED_FILE;
    if (!configuredFile) return null;

    const filePath = path.isAbsolute(configuredFile)
        ? configuredFile
        : path.join(process.cwd(), configuredFile);
    const text = await readFile(filePath, "utf8");
    return {
        payload: parseFeedText(text),
        source: filePath,
        sourceType: "file",
    };
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
    const incomingProperties = record(root.properties);
    const properties = { ...incomingProperties, ...root };
    delete properties.geometry;

    const coords = coordinates(root);
    if (!coords) return null;

    const location = record(root.location ?? incomingProperties.location);
    const addressRecord = record(root.address ?? incomingProperties.address ?? location.address);
    const id = getString(properties.id)
        ?? getString(properties.incidentId)
        ?? getString(properties.eventId)
        ?? getString(properties.uuid)
        ?? `citizen-${index}`;
    const category = firstString(
        properties.category,
        properties.incidentType,
        properties.eventType,
        properties.type,
        properties.kind,
    );
    const name = firstString(properties.title, properties.name, category)
        ?? "Citizen incident";
    const description = firstString(
        properties.description,
        properties.summary,
        properties.details,
        properties.body,
    );
    const address = firstString(
        properties.address,
        properties.locationName,
        properties.place,
        location.address,
        location.name,
        addressRecord.formatted,
        addressRecord.formattedAddress,
        addressRecord.street,
    );
    const severity = firstString(properties.severity, properties.priority, properties.level) ?? "unknown";
    const status = firstString(properties.status, properties.state, properties.lifecycle);
    const sourceUrl = firstString(
        properties.sourceUrl,
        properties.url,
        properties.webUrl,
        properties.shareUrl,
        properties.incidentUrl,
        properties.permalink,
    );
    const imageUrl = firstString(properties.imageUrl, properties.thumbnailUrl, properties.photoUrl);
    const videoUrl = firstString(properties.videoUrl, properties.liveVideoUrl, properties.mediaUrl);
    const updatesCount = firstNumber(properties.updatesCount, properties.updateCount, properties.updates);
    const notifiedCount = firstNumber(properties.notifiedCount, properties.notified, properties.notifications);
    const reactionsCount = firstNumber(properties.reactionsCount, properties.reactions);
    const reportedAt = properties.time ?? properties.timestamp ?? properties.createdAt ?? properties.reportedAt ?? properties.dateTime;

    return {
        type: "Feature",
        properties: {
            ...properties,
            id,
            name,
            title: name,
            type: category,
            category,
            description,
            summary: description,
            address,
            severity,
            status,
            sourceUrl,
            imageUrl,
            videoUrl,
            updatesCount,
            notifiedCount,
            reactionsCount,
            pluginId: "citizen",
            source: "Citizen authorized feed",
            time: reportedAt,
        },
        geometry: { type: "Point", coordinates: coords },
    };
}

export async function GET() {
    try {
        const configured = await loadConfiguredPayload();
        if (!configured) {
            return NextResponse.json({
                type: "FeatureCollection",
                features: [],
                metadata: {
                    count: 0,
                    status: "not_configured",
                    acceptedFormats: ["GeoJSON FeatureCollection", "JSON array", "JSON object with incidents/events/items/data/results/records", "JSONL"],
                    note: "Set CITIZEN_API_URL, CITIZEN_API_BASE_URL, or CITIZEN_FEED_FILE plus CITIZEN_API_KEY when required to load an authorized Citizen/incident export.",
                },
            });
        }

        const features = incidentArray(configured.payload)
            .map(normalizeFeature)
            .filter((feature): feature is NonNullable<ReturnType<typeof normalizeFeature>> => !!feature);

        return NextResponse.json({
            type: "FeatureCollection",
            features,
            metadata: {
                count: features.length,
                source: configured.source,
                sourceType: configured.sourceType,
                status: "ok",
                refreshedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("[CitizenRoute] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch Citizen authorized feed" },
            { status: 502 },
        );
    }
}
