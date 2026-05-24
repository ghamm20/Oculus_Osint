import { NextResponse } from "next/server";
import { clearCatalogCache, fetchLiveSourceCatalog } from "@/server/liveSources/catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
    clearCatalogCache();
    const { items, diagnostics } = await fetchLiveSourceCatalog({ includeSamples: true });
    return NextResponse.json({
        refreshed: true,
        total: items.length,
        diagnostics,
        refreshed_at: new Date().toISOString(),
    });
}
