import { NextResponse, type NextRequest } from "next/server";
import { getSensorScheduler } from "@/server/sensorFusion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const scheduler = getSensorScheduler();
    scheduler.start();
    const since = req.nextUrl.searchParams.get("since");
    const mode = req.nextUrl.searchParams.get("mode") ?? "global-awareness";
    return NextResponse.json({
        narrative: scheduler.getNarrative(since, mode),
        generated_at: new Date().toISOString(),
        diagnostics: {
            method: "heuristic",
            ai_assisted: false,
        },
    });
}
