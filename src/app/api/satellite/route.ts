import { NextResponse, type NextRequest } from "next/server";
import {
    degreesLat,
    degreesLong,
    eciToGeodetic,
    gstime,
    json2satrec,
    propagate,
} from "satellite.js";

export const revalidate = 60;
export const runtime = "nodejs";

const CELESTRAK_GP_URL = "https://celestrak.org/NORAD/elements/gp.php";
const DEFAULT_GROUPS = [
    "stations",
    "weather",
    "resource",
    "science",
    "geo",
    "gps-ops",
    "galileo",
    "beidou",
    "visual",
    "intelsat",
    "ses",
    "iridium-NEXT",
    "oneweb",
];
const ALL_GROUPS = [...DEFAULT_GROUPS, "starlink"];
const DEFAULT_LIMIT = 2200;
const MAX_LIMIT = 5000;

interface CelesTrakRecord {
    OBJECT_NAME?: string;
    OBJECT_ID?: string;
    NORAD_CAT_ID: number | string;
    EPOCH: string;
    MEAN_MOTION: number | string;
    ECCENTRICITY: number | string;
    INCLINATION: number | string;
    RA_OF_ASC_NODE: number | string;
    ARG_OF_PERICENTER: number | string;
    MEAN_ANOMALY: number | string;
    EPHEMERIS_TYPE?: number | string;
    CLASSIFICATION_TYPE?: string;
    ELEMENT_SET_NO?: number | string;
    REV_AT_EPOCH?: number | string;
    BSTAR?: number | string;
    MEAN_MOTION_DOT?: number | string;
    MEAN_MOTION_DDOT?: number | string;
}

function uniqueStrings(values: string[]): string[] {
    return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean)));
}

function resolveGroups(raw: string | null): string[] {
    const configured = process.env.SATELLITE_FEED_GROUPS;
    const source = raw || configured || DEFAULT_GROUPS.join(",");
    const requested = source.split(",").flatMap((part) => {
        const clean = part.trim();
        if (!clean) return [];
        if (clean === "all") return ALL_GROUPS;
        return [clean];
    });
    return uniqueStrings(requested);
}

function resolveLimit(raw: string | null): number {
    const value = Number(raw ?? process.env.SATELLITE_FEED_LIMIT ?? DEFAULT_LIMIT);
    if (!Number.isFinite(value) || value <= 0) return DEFAULT_LIMIT;
    return Math.min(Math.floor(value), MAX_LIMIT);
}

async function fetchGroup(group: string): Promise<CelesTrakRecord[]> {
    const params = new URLSearchParams({ GROUP: group, FORMAT: "json" });
    const response = await fetch(`${CELESTRAK_GP_URL}?${params}`, {
        headers: { Accept: "application/json", "User-Agent": "Oculus0Osint/1.0" },
        next: { revalidate },
    });

    if (!response.ok) throw new Error(`${group}: ${response.status}`);

    const payload = await response.json();
    if (!Array.isArray(payload)) return [];
    return payload.map((item) => ({ ...(item as CelesTrakRecord), __group: group }) as CelesTrakRecord & { __group: string });
}

function velocityMetersPerSecond(velocity: { x: number; y: number; z: number } | undefined): number | undefined {
    if (!velocity) return undefined;
    const kmPerSecond = Math.sqrt(
        velocity.x * velocity.x +
        velocity.y * velocity.y +
        velocity.z * velocity.z,
    );
    return Number.isFinite(kmPerSecond) ? kmPerSecond * 1000 : undefined;
}

function toFeature(record: CelesTrakRecord & { __group?: string }, now: Date) {
    const satrec = json2satrec(record as any);
    const positionAndVelocity = propagate(satrec, now);
    if (!positionAndVelocity?.position) return null;

    const geodetic = eciToGeodetic(positionAndVelocity.position, gstime(now));
    const latitude = degreesLat(geodetic.latitude);
    const longitude = degreesLong(geodetic.longitude);
    const altitudeMeters = geodetic.height * 1000;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(altitudeMeters)) {
        return null;
    }

    const group = record.__group ?? "unknown";
    const noradId = String(record.NORAD_CAT_ID);
    const name = record.OBJECT_NAME ?? `NORAD ${noradId}`;

    return {
        type: "Feature",
        properties: {
            id: `${group}-${noradId}`,
            name,
            pluginId: "satellite",
            source: "CelesTrak GP",
            group,
            satType: group,
            noradId,
            objectId: record.OBJECT_ID,
            classification: record.CLASSIFICATION_TYPE,
            epoch: record.EPOCH,
            inclination: Number(record.INCLINATION),
            meanMotion: Number(record.MEAN_MOTION),
            altitudeKm: geodetic.height,
            velocity: velocityMetersPerSecond(positionAndVelocity.velocity),
            time: now.toISOString(),
        },
        geometry: {
            type: "Point",
            coordinates: [longitude, latitude, altitudeMeters],
        },
    };
}

export async function GET(req: NextRequest) {
    const groups = resolveGroups(req.nextUrl.searchParams.get("groups"));
    const limit = resolveLimit(req.nextUrl.searchParams.get("limit"));
    const nowParam = req.nextUrl.searchParams.get("time");
    const now = nowParam ? new Date(nowParam) : new Date();
    const propagatedAt = Number.isFinite(now.getTime()) ? now : new Date();

    const results = await Promise.allSettled(groups.map(fetchGroup));
    const errors: string[] = [];
    const seen = new Set<string>();
    const records: Array<CelesTrakRecord & { __group?: string }> = [];

    for (const result of results) {
        if (result.status === "rejected") {
            errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
            continue;
        }

        for (const record of result.value as Array<CelesTrakRecord & { __group?: string }>) {
            const key = String(record.NORAD_CAT_ID);
            if (!key || seen.has(key)) continue;
            seen.add(key);
            records.push(record);
            if (records.length >= limit) break;
        }
        if (records.length >= limit) break;
    }

    const features = [];
    for (const record of records) {
        try {
            const feature = toFeature(record, propagatedAt);
            if (feature) features.push(feature);
        } catch (error) {
            errors.push(`${record.OBJECT_NAME ?? record.NORAD_CAT_ID}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    return NextResponse.json({
        type: "FeatureCollection",
        features,
        metadata: {
            count: features.length,
            requestedGroups: groups,
            source: CELESTRAK_GP_URL,
            propagatedAt: propagatedAt.toISOString(),
            limit,
            errors,
        },
    });
}
