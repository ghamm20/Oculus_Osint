import { NextResponse } from "next/server";
export const revalidate = 86400;
const MAJOR_AIRPORTS = [
    { id: "LHR", name: "London Heathrow", lat: 51.4700, lon: -0.4543, iata: "LHR", country: "UK" },
    { id: "JFK", name: "John F. Kennedy", lat: 40.6413, lon: -73.7781, iata: "JFK", country: "USA" },
    { id: "HND", name: "Tokyo Haneda", lat: 35.5494, lon: 139.7798, iata: "HND", country: "Japan" },
    { id: "DXB", name: "Dubai International", lat: 25.2532, lon: 55.3657, iata: "DXB", country: "UAE" },
    { id: "CDG", name: "Paris Charles de Gaulle", lat: 49.0097, lon: 2.5479, iata: "CDG", country: "France" },
    { id: "SIN", name: "Singapore Changi", lat: 1.3644, lon: 103.9915, iata: "SIN", country: "Singapore" },
    { id: "LAX", name: "Los Angeles", lat: 33.9425, lon: -118.4081, iata: "LAX", country: "USA" },
    { id: "FRA", name: "Frankfurt", lat: 50.0379, lon: 8.5622, iata: "FRA", country: "Germany" },
    { id: "SYD", name: "Sydney Kingsford Smith", lat: -33.9399, lon: 151.1753, iata: "SYD", country: "Australia" },
    { id: "ATH", name: "Athens Eleftherios Venizelos", lat: 37.9364, lon: 23.9445, iata: "ATH", country: "Greece" },
    { id: "PEK", name: "Beijing Capital", lat: 40.0799, lon: 116.6031, iata: "PEK", country: "China" },
    { id: "ATL", name: "Atlanta Hartsfield-Jackson", lat: 33.6407, lon: -84.4277, iata: "ATL", country: "USA" },
];
export async function GET() {
    try {
        const features = MAJOR_AIRPORTS.map((a) => ({ type: "Feature", properties: { id: a.id, name: a.name, pluginId: "airports", iata: a.iata, country: a.country },
            geometry: { type: "Point", coordinates: [a.lon, a.lat] } }));
        return NextResponse.json({ type: "FeatureCollection", features, metadata: { count: features.length, source: "ourairports-sample", note: "Replace with full OurAirports API for production" } });
    } catch (error) { console.error("[AirportsRoute] Error:", error); return NextResponse.json({ error: "Failed to fetch airport data" }, { status: 502 }); }
}