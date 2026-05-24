import { NextResponse, type NextRequest } from "next/server";
import { getSensorScheduler } from "@/server/sensorFusion";
import { parseBbox } from "@/server/sensorFusion/query";
import { replayStore } from "@/server/sensorFusion/replayStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const scheduler = getSensorScheduler();
    scheduler.start();
    const params = req.nextUrl.searchParams;
    const updates = replayStore.query({
        start: params.get("start"),
        end: params.get("end"),
        bbox: parseBbox(params.get("bbox")),
    });
    const limit = Number(params.get("limit") ?? "1000");
    return NextResponse.json({
        updates: updates.slice(0, Number.isFinite(limit) ? Math.max(1, Math.min(limit, 5000)) : 1000),
        total: updates.length,
        generated_at: new Date().toISOString(),
        retention_hours: 24,
    });
}
