import { NextResponse } from "next/server";
import { getSensorScheduler } from "@/server/sensorFusion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
    const scheduler = getSensorScheduler();
    scheduler.start();
    const result = await scheduler.refreshAll(true);
    return NextResponse.json({
        refreshed: true,
        event_count: result.events.length,
        entity_count: result.entities.length,
        provider_health: result.provider_health,
        refreshed_at: new Date().toISOString(),
    });
}
