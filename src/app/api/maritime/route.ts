import { NextResponse } from "next/server";
export const revalidate = 300;
const VESSELS = [
    { mmsi: "244010000", name: "MAERSK Vessel 1", lat: 51.9, lon: 4.4, speed: 12, heading: 90, type: "Cargo" },
    { mmsi: "244020000", name: "MSC Container 2", lat: 36.1, lon: -5.3, speed: 15, heading: 45, type: "Cargo" },
    { mmsi: "244030000", name: "COSCO Shipping 3", lat: 31.2, lon: 121.5, speed: 8, heading: 180, type: "Cargo" },
    { mmsi: "244040000", name: "Evergreen 4", lat: 1.3, lon: 103.8, speed: 14, heading: 270, type: "Cargo" },
    { mmsi: "244050000", name: "Hapag Lloyd 5", lat: 40.7, lon: -74.0, speed: 10, heading: 135, type: "Cargo" },
    { mmsi: "244060000", name: "Cruise Ship A", lat: 25.8, lon: -80.2, speed: 18, heading: 0, type: "Passenger" },
    { mmsi: "244070000", name: "Tanker Alpha", lat: 29.0, lon: 48.0, speed: 6, heading: 45, type: "Tanker" },
    { mmsi: "244080000", name: "Fishing Trawler 1", lat: 57.0, lon: -8.0, speed: 5, heading: 90, type: "Fishing" },
    { mmsi: "244090000", name: "Yacht Serenity", lat: 43.7, lon: 7.3, speed: 20, heading: 180, type: "Pleasure" },
    { mmsi: "244100000", name: "Oil Rig Supply", lat: 60.0, lon: 2.0, speed: 9, heading: 270, type: "Support" },
];
export async function GET() {
    try {
        const features = VESSELS.map((v) => ({ type: "Feature", properties: { id: v.mmsi, name: v.name, pluginId: "maritime", speed: v.speed, heading: v.heading, vesselType: v.type },
            geometry: { type: "Point", coordinates: [v.lon, v.lat] } }));
        return NextResponse.json({ type: "FeatureCollection", features, metadata: { count: features.length, source: "sample-data", note: "Replace with live AIS API for production" } });
    } catch (error) { console.error("[MaritimeRoute] Error:", error); return NextResponse.json({ error: "Failed to fetch maritime data" }, { status: 502 }); }
}