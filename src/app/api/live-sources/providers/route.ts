import { NextResponse } from "next/server";
import { liveSourceProviders, providerSummary } from "@/server/liveSources/providers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    return NextResponse.json({
        providers: liveSourceProviders.map(providerSummary),
        count: liveSourceProviders.length,
    });
}
