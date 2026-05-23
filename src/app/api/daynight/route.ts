import { NextResponse } from "next/server";
export const revalidate = 60;
function getSunTerminator() {
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    const declination = 23.45 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365) * (Math.PI / 180);
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
    const longitudeOfSun = -15 * (utcHours - 12);
    const coordinates = [];
    const segments = 36;
    for (let i = 0; i < segments; i++) {
        const lat1 = -90 + (180 / segments) * i;
        const lat2 = -90 + (180 / segments) * (i + 1);
        const lon1 = longitudeOfSun - (lat1 / 90) * 90 * Math.tan(declination);
        const lon2 = longitudeOfSun - (lat2 / 90) * 90 * Math.tan(declination);
        coordinates.push([[lon1, lat1], [lon2, lat2]]);
    }
    return [{ type: "Feature", properties: { id: "daynight-terminator", name: "Day/Night Terminator", pluginId: "daynight", declination: declination * (180 / Math.PI), sunLongitude: longitudeOfSun },
        geometry: { type: "MultiLineString", coordinates } }];
}
export async function GET() {
    try {
        const features = getSunTerminator();
        return NextResponse.json({ type: "FeatureCollection", features, metadata: { count: features.length, source: "computed", note: "Mathematical day/night terminator" } });
    } catch (error) { console.error("[DayNightRoute] Error:", error); return NextResponse.json({ error: "Failed to compute day/night data" }, { status: 502 }); }
}