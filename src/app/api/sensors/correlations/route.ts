import { NextResponse } from "next/server";
import { getSensorScheduler } from "@/server/sensorFusion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const scheduler = getSensorScheduler();
    scheduler.start();
    return NextResponse.json({
        correlations: scheduler.getCorrelations(),
        generated_at: new Date().toISOString(),
        diagnostics: {
            method: "heuristic",
        },
    });
}
