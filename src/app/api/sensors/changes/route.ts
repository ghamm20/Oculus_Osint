import { NextResponse, type NextRequest } from "next/server";
import { getSensorScheduler } from "@/server/sensorFusion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const scheduler = getSensorScheduler();
    scheduler.start();
    const since = req.nextUrl.searchParams.get("since");
    const events = scheduler.getChanges(since);
    return NextResponse.json({
        events,
        total: events.length,
        since,
        generated_at: new Date().toISOString(),
    });
}
