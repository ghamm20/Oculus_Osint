import { NextResponse, type NextRequest } from "next/server";
import { fetchLiveSourceCatalog } from "@/server/liveSources/catalog";
import { parseBbox, parseTypes } from "@/server/liveSources/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const params = req.nextUrl.searchParams;
    const limitRaw = Number(params.get("limit") ?? "5000");
    const { items, diagnostics } = await fetchLiveSourceCatalog({
        provider: params.get("provider") || undefined,
        type: parseTypes(params.get("type")),
        bbox: parseBbox(params.get("bbox")),
        q: params.get("q") || undefined,
        limit: Number.isFinite(limitRaw) ? limitRaw : 5000,
        includeSamples: params.get("samples") !== "0",
    });

    return NextResponse.json({
        items,
        total: items.length,
        diagnostics: {
            ...diagnostics,
            no_data_loaded: items.length === 0,
        },
        refreshed_at: new Date().toISOString(),
    });
}
