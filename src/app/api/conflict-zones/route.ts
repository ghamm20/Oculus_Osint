import { NextResponse } from "next/server";
export const revalidate = 3600;
const CONFLICTS = [
    { id: "ua-1", name: "Ukraine Conflict", lat: 48.5, lon: 37.5, intensity: "high", fatalities: 500000 },
    { id: "sy-1", name: "Syrian Civil War", lat: 35.0, lon: 38.0, intensity: "high", fatalities: 600000 },
    { id: "ye-1", name: "Yemen Crisis", lat: 15.0, lon: 48.0, intensity: "high", fatalities: 150000 },
    { id: "mm-1", name: "Myanmar Conflict", lat: 21.0, lon: 96.0, intensity: "medium", fatalities: 30000 },
    { id: "ss-1", name: "South Sudan Crisis", lat: 7.0, lon: 30.0, intensity: "medium", fatalities: 400000 },
    { id: "ml-1", name: "Mali Conflict", lat: 17.0, lon: -2.0, intensity: "medium", fatalities: 20000 },
    { id: "ps-1", name: "Gaza Conflict", lat: 31.5, lon: 34.5, intensity: "high", fatalities: 40000 },
    { id: "et-1", name: "Ethiopia-Tigray", lat: 14.0, lon: 39.0, intensity: "high", fatalities: 600000 },
];
export async function GET() {
    try {
        const features = CONFLICTS.map((c) => ({ type: "Feature", properties: { id: c.id, name: c.name, pluginId: "conflict-zones", intensity: c.intensity, fatalities: c.fatalities },
            geometry: { type: "Point", coordinates: [c.lon, c.lat] } }));
        return NextResponse.json({ type: "FeatureCollection", features, metadata: { count: features.length, source: "acled-ucdp-sample", note: "Replace with live ACLED API for production" } });
    } catch (error) { console.error("[ConflictZonesRoute] Error:", error); return NextResponse.json({ error: "Failed to fetch conflict data" }, { status: 502 }); }
}