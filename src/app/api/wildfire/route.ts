import { NextResponse } from "next/server";
export const revalidate = 300;
const WILDFIRES = [
    { id: "ca-1", name: "Northern California Fire", lat: 39.5, lon: -121.5, brightness: 400, confidence: "high" },
    { id: "ca-2", name: "Southern California Fire", lat: 34.0, lon: -118.2, brightness: 380, confidence: "high" },
    { id: "au-1", name: "Australian Bushfire", lat: -35.0, lon: 148.0, brightness: 420, confidence: "high" },
    { id: "br-1", name: "Amazon Fire", lat: -8.0, lon: -55.0, brightness: 350, confidence: "medium" },
    { id: "ru-1", name: "Siberian Fire", lat: 55.0, lon: 100.0, brightness: 360, confidence: "medium" },
    { id: "gr-1", name: "Greek Wildfire", lat: 38.0, lon: 23.5, brightness: 390, confidence: "high" },
];
export async function GET() {
    try {
        const features = WILDFIRES.map((f) => ({ type: "Feature", properties: { id: f.id, name: f.name, pluginId: "wildfire", brightness: f.brightness, confidence: f.confidence },
            geometry: { type: "Point", coordinates: [f.lon, f.lat] } }));
        return NextResponse.json({ type: "FeatureCollection", features, metadata: { count: features.length, source: "nasa-firms-sample", note: "Replace with live NASA FIRMS API for production" } });
    } catch (error) { console.error("[WildfireRoute] Error:", error); return NextResponse.json({ error: "Failed to fetch wildfire data" }, { status: 502 }); }
}