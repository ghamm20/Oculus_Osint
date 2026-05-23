import { NextResponse } from "next/server";
export const revalidate = 3600;
const VOLCANOES = [
    { id: "kilauea", name: "Kilauea", lat: 19.4069, lon: -155.2834, status: "Erupting", elevation: 1247 },
    { id: "etna", name: "Mount Etna", lat: 37.7510, lon: 14.9934, status: "Erupting", elevation: 3357 },
    { id: "vesuvius", name: "Mount Vesuvius", lat: 40.8224, lon: 14.4289, status: "Active", elevation: 1281 },
    { id: "fuji", name: "Mount Fuji", lat: 35.3606, lon: 138.7274, status: "Dormant", elevation: 3776 },
    { id: "yellowstone", name: "Yellowstone Caldera", lat: 44.4280, lon: -110.5885, status: "Active", elevation: 2805 },
    { id: "merapi", name: "Mount Merapi", lat: -7.5407, lon: 110.4469, status: "Active", elevation: 2968 },
    { id: "pinatubo", name: "Mount Pinatubo", lat: 15.1429, lon: 120.3496, status: "Dormant", elevation: 1486 },
    { id: "popocatepetl", name: "Popocatepetl", lat: 19.0223, lon: -98.6279, status: "Erupting", elevation: 5426 },
    { id: "stromboli", name: "Stromboli", lat: 38.7890, lon: 15.2133, status: "Erupting", elevation: 926 },
    { id: "eyjafjallajokull", name: "Eyjafjallajokull", lat: 63.6314, lon: -19.6083, status: "Dormant", elevation: 1651 },
];
export async function GET() {
    try {
        const features = VOLCANOES.map((v) => ({ type: "Feature", properties: { id: v.id, name: v.name, pluginId: "volcanoes", status: v.status, elevation: v.elevation },
            geometry: { type: "Point", coordinates: [v.lon, v.lat] } }));
        return NextResponse.json({ type: "FeatureCollection", features, metadata: { count: features.length, source: "smithsonian-gvp", note: "Major Holocene volcanoes" } });
    } catch (error) { console.error("[VolcanoesRoute] Error:", error); return NextResponse.json({ error: "Failed to fetch volcano data" }, { status: 502 }); }
}