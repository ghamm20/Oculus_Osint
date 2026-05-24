import { NextResponse, type NextRequest } from "next/server";
import { sampleArgosEntities } from "@/server/liveSources/samples";
import { parseBbox } from "@/server/liveSources/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const bbox = parseBbox(req.nextUrl.searchParams.get("bbox"));
    const vessels = sampleArgosEntities()
        .filter((item) => item.type === "ais")
        .filter((item) => {
            if (!bbox || item.lat === null || item.lon === null) return true;
            const [minLon, minLat, maxLon, maxLat] = bbox;
            return item.lon >= minLon && item.lon <= maxLon && item.lat >= minLat && item.lat <= maxLat;
        })
        .map((item) => ({
            id: item.id,
            provider: "marinecadastre-ais",
            title: item.title,
            lat: item.lat,
            lon: item.lon,
            source_page_url: item.source_page_url,
            last_checked: item.last_checked,
            diagnostics: item.diagnostics,
        }));

    return NextResponse.json({
        status: "unavailable",
        source: "MarineCadastre AccessAIS",
        message: "MarineCadastre AccessAIS is historical/order-based data and is not exposed here as a real-time AIS stream.",
        vessels,
        sample: true,
        diagnostics: {
            live_ais: false,
            source_page_url: "https://marinecadastre.gov/accessais/",
            start: req.nextUrl.searchParams.get("start"),
            end: req.nextUrl.searchParams.get("end"),
        },
    });
}
