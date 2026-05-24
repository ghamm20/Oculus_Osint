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

function getBoolean(value: unknown): boolean | undefined {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
        const lower = value.trim().toLowerCase();
        if (["true", "yes", "1"].includes(lower)) return true;
        if (["false", "no", "0"].includes(lower)) return false;
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

function observations(payload: unknown): unknown[] {
    if (Array.isArray(payload)) return payload;
    const root = record(payload);
    if (Array.isArray(root.features)) return root.features;
    for (const key of ["observations", "detections", "reads", "hits", "events", "items", "data", "results", "records"]) {
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
        return normalized
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => JSON.parse(line));
    }
}

async function loadConfiguredPayload(): Promise<{ payload: unknown; source: string; sourceType: "url" | "file" } | null> {
    const url = process.env.FLOCK_API_URL
        || (process.env.FLOCK_API_BASE_URL
            ? new URL(process.env.FLOCK_API_EVENTS_PATH || "/events", process.env.FLOCK_API_BASE_URL).toString()
            : undefined);

    if (url) {
        const headers: Record<string, string> = {
            Accept: "application/json",
            "User-Agent": "Oculus0Osint/1.0",
        };
        if (process.env.FLOCK_API_KEY) {
            headers.Authorization = `Bearer ${process.env.FLOCK_API_KEY}`;
            headers["x-api-key"] = process.env.FLOCK_API_KEY;
        }

        const response = await fetch(url, { headers, cache: "no-store" });
        if (!response.ok) throw new Error(`Flock authorized feed returned ${response.status}`);

        return { payload: await response.json(), source: url, sourceType: "url" };
    }

    const configuredFile = process.env.FLOCK_FEED_FILE;
    if (!configuredFile) return null;

    const filePath = path.isAbsolute(configuredFile)
        ? configuredFile
        : path.join(process.cwd(), configuredFile);
    return {
        payload: parseFeedText(await readFile(filePath, "utf8")),
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
    const camera = record(item.camera ?? properties.camera);
    const location = record(item.location ?? properties.location ?? camera.location);

    const lat = firstNumber(
        item.latitude,
        item.lat,
        properties.latitude,
        properties.lat,
        camera.latitude,
        camera.lat,
        location.latitude,
        location.lat,
    );
    const lon = firstNumber(
        item.longitude,
        item.lon,
        item.lng,
        properties.longitude,
        properties.lon,
        properties.lng,
        camera.longitude,
        camera.lon,
        camera.lng,
        location.longitude,
        location.lon,
        location.lng,
    );

    return lat !== undefined && lon !== undefined ? [lon, lat] : null;
}

function maskPlate(plate: string | undefined): string | undefined {
    if (!plate) return undefined;
    const compact = plate.replace(/\s+/g, "");
    if (compact.length <= 3) return "***";
    return `***${compact.slice(-4)}`;
}

function normalizeObservation(item: unknown, index: number) {
    const root = record(item);
    const properties = record(root.properties);
    const vehicle = record(root.vehicle ?? properties.vehicle);
    const camera = record(root.camera ?? properties.camera);
    const location = record(root.location ?? properties.location ?? camera.location);
    const hotlist = record(root.hotlist ?? properties.hotlist ?? root.alert ?? properties.alert);
    const coords = coordinates(root);
    if (!coords) return null;

    const allowFullPlate = process.env.FLOCK_SHOW_FULL_PLATE === "true";
    const rawPlate = firstString(
        root.plate,
        root.licensePlate,
        root.plateNumber,
        root.tag,
        root.license_plate,
        properties.plate,
        properties.licensePlate,
        properties.plateNumber,
        vehicle.plate,
        vehicle.licensePlate,
        vehicle.plateNumber,
    );
    const plate = allowFullPlate ? rawPlate : maskPlate(rawPlate);
    const plateState = firstString(root.plateState, root.state, properties.plateState, properties.state, vehicle.state, vehicle.plateState);
    const cameraName = firstString(root.cameraName, properties.cameraName, camera.name, camera.displayName, camera.id);
    const make = firstString(root.make, properties.make, vehicle.make);
    const model = firstString(root.model, properties.model, vehicle.model);
    const color = firstString(root.color, properties.color, vehicle.color);
    const vehicleType = firstString(root.vehicleType, properties.vehicleType, vehicle.type, vehicle.bodyStyle);
    const address = firstString(root.address, properties.address, location.address, location.name, camera.address);
    const observedAt = root.time ?? root.timestamp ?? root.observedAt ?? root.detectedAt ?? root.createdAt ?? properties.time ?? properties.timestamp;
    const hotlistHit = getBoolean(root.hotlistHit ?? properties.hotlistHit ?? root.isHit ?? properties.isHit ?? hotlist.hit)
        ?? Boolean(firstString(root.alertType, properties.alertType, hotlist.type, hotlist.name));
    const id = firstString(root.id, root.detectionId, root.readId, root.eventId, root.uuid, properties.id)
        ?? `flock-${index}`;
    const title = [
        hotlistHit ? "ALPR alert" : "ALPR observation",
        plate,
        cameraName,
    ].filter(Boolean).join(" - ");

    return {
        type: "Feature",
        properties: {
            id,
            name: title,
            title,
            pluginId: "flock",
            source: "Flock authorized feed",
            plate,
            plateMasked: maskPlate(rawPlate),
            fullPlateVisible: allowFullPlate,
            plateState,
            vehicleMake: make,
            vehicleModel: model,
            vehicleColor: color,
            vehicleType,
            confidence: firstNumber(root.confidence, properties.confidence, vehicle.confidence),
            cameraId: firstString(root.cameraId, properties.cameraId, camera.id),
            cameraName,
            agency: firstString(root.agency, properties.agency, camera.agency, camera.ownerAgency),
            address,
            direction: firstString(root.direction, properties.direction, camera.direction),
            lane: firstString(root.lane, properties.lane),
            speed: firstNumber(root.speed, properties.speed, vehicle.speed),
            hotlistHit,
            alertType: firstString(root.alertType, properties.alertType, hotlist.type, hotlist.name),
            alertReason: firstString(root.alertReason, properties.alertReason, hotlist.reason, hotlist.description),
            imageUrl: firstString(root.imageUrl, root.image, root.vehicleImageUrl, properties.imageUrl, properties.image, vehicle.imageUrl),
            sourceUrl: firstString(root.sourceUrl, root.url, root.webUrl, properties.sourceUrl, properties.url, properties.webUrl),
            time: observedAt,
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
                    acceptedFormats: ["GeoJSON FeatureCollection", "JSON array", "JSON object with observations/detections/reads/hits/events/items/data/results/records", "JSONL"],
                    note: "Set FLOCK_API_URL, FLOCK_API_BASE_URL, or FLOCK_FEED_FILE plus FLOCK_API_KEY when required. Plate values are masked unless FLOCK_SHOW_FULL_PLATE=true.",
                },
            });
        }

        const features = observations(configured.payload)
            .map(normalizeObservation)
            .filter((feature): feature is NonNullable<ReturnType<typeof normalizeObservation>> => !!feature);

        return NextResponse.json({
            type: "FeatureCollection",
            features,
            metadata: {
                count: features.length,
                source: configured.source,
                sourceType: configured.sourceType,
                status: "ok",
                platesMasked: process.env.FLOCK_SHOW_FULL_PLATE !== "true",
                refreshedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("[FlockRoute] Error:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch Flock authorized feed" },
            { status: 502 },
        );
    }
}
