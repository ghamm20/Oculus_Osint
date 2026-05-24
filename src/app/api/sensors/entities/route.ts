import { NextResponse, type NextRequest } from "next/server";
import { getSensorScheduler } from "@/server/sensorFusion";
import { filterEntities, parseBbox } from "@/server/sensorFusion/query";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const scheduler = getSensorScheduler();
    scheduler.start();
    const params = req.nextUrl.searchParams;
    const limit = Number(params.get("limit") ?? "10000");
    const entities = filterEntities(scheduler.getEntities(), {
        type: params.get("type"),
        provider: params.get("provider"),
        bbox: parseBbox(params.get("bbox")),
        q: params.get("q"),
        freshness: params.get("freshness"),
        severity: params.get("severity"),
        limit: Number.isFinite(limit) ? limit : 10_000,
    });
    return NextResponse.json({
        entities,
        total: entities.length,
        generated_at: new Date().toISOString(),
        diagnostics: {
            no_data_loaded: entities.length === 0,
        },
    });
}
