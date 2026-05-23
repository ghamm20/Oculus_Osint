import { NextResponse } from "next/server";
export const revalidate = 30;
const OPENSKY_URL = "https://opensky-network.org/api/states/all";
function parseAircraftState(state) {
    return { icao24: state[0], callsign: state[1]?.trim() || null, origin_country: state[2],
        longitude: state[5], latitude: state[6], altitude: state[7], velocity: state[9],
        heading: state[10], vertical_rate: state[11], on_ground: state[8] === true || state[8] === 1, last_contact: state[4] };
}
export async function GET() {
    try {
        const response = await fetch(OPENSKY_URL, { headers: { "User-Agent": "Oculus0Osint/1.0" }, next: { revalidate } });
        if (!response.ok) return NextResponse.json({ error: "Failed to fetch aviation data" }, { status: 502 });
        const data = await response.json();
        const states = Array.isArray(data?.states) ? data.states : [];
        const features = states.filter((s) => s[5] !== null && s[6] !== null).map((s) => {
            const ac = parseAircraftState(s);
            return { type: "Feature", properties: { id: ac.icao24, name: ac.callsign || ac.icao24, pluginId: "aviation", country: ac.origin_country, altitude: ac.altitude, velocity: ac.velocity, heading: ac.heading, onGround: ac.on_ground },
                geometry: { type: "Point", coordinates: [ac.longitude, ac.latitude, ac.altitude || 0] } };
        });
        return NextResponse.json({ type: "FeatureCollection", features, metadata: { count: features.length, time: data?.time } });
    } catch (error) { console.error("[AviationRoute] Error:", error); return NextResponse.json({ error: "Failed to fetch aviation data" }, { status: 502 }); }
}