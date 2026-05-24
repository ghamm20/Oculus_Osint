import { NextResponse, type NextRequest } from "next/server";
import { getSensorScheduler } from "@/server/sensorFusion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const scheduler = getSensorScheduler();
    scheduler.start();
    const limit = Number(req.nextUrl.searchParams.get("limit") ?? "200");
    const events = scheduler.getEvents(Number.isFinite(limit) ? limit : 200);
    return NextResponse.json({
        events,
        total: events.length,
        generated_at: new Date().toISOString(),
    });
}
