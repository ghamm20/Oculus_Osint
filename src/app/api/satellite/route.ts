import { NextResponse } from "next/server";
export const revalidate = 60;
const SATELLITES = [
    { id: "ISS", name: "International Space Station", lat: 51.6, lon: -0.1, alt: 408, type: "Station" },
    { id: "HUBBLE", name: "Hubble Space Telescope", lat: 28.5, lon: -80.6, alt: 540, type: "Telescope" },
    { id: "STARLINK-1007", name: "Starlink 1007", lat: 53.0, lon: -1.5, alt: 550, type: "Communications" },
    { id: "STARLINK-1008", name: "Starlink 1008", lat: 53.0, lon: 10.0, alt: 550, type: "Communications" },
    { id: "GPS-IIF", name: "GPS IIF", lat: 55.0, lon: 0.0, alt: 20200, type: "Navigation" },
    { id: "GLONASS", name: "GLONASS-M", lat: 64.8, lon: 35.0, alt: 19100, type: "Navigation" },
    { id: "GALILEO-1", name: "Galileo FOC 1", lat: 56.0, lon: 10.0, alt: 23222, type: "Navigation" },
    { id: "TERRA", name: "Terra (EOS AM-1)", lat: 98.2, lon: -120.0, alt: 705, type: "Earth Observation" },
    { id: "AQUA", name: "Aqua", lat: 98.2, lon: 30.0, alt: 705, type: "Earth Observation" },
    { id: "NOAA-20", name: "NOAA-20", lat: 98.7, lon: -90.0, alt: 824, type: "Weather" },
];
export async function GET() {
    try {
        const features = SATELLITES.map((s) => ({ type: "Feature", properties: { id: s.id, name: s.name, pluginId: "satellite", altitude: s.alt, satType: s.type },
            geometry: { type: "Point", coordinates: [s.lon, s.lat, s.alt] } }));
        return NextResponse.json({ type: "FeatureCollection", features, metadata: { count: features.length, source: "static-positions", note: "Replace with live TLE propagation for production" } });
    } catch (error) { console.error("[SatelliteRoute] Error:", error); return NextResponse.json({ error: "Failed to fetch satellite data" }, { status: 502 }); }
}