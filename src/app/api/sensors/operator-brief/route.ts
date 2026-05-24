import { NextResponse, type NextRequest } from "next/server";
import { getSensorScheduler } from "@/server/sensorFusion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const scheduler = getSensorScheduler();
    scheduler.start();
    const mode = req.nextUrl.searchParams.get("mode") ?? "global-awareness";
    const brief = scheduler.getBrief(mode);
    return NextResponse.json({
        brief,
        generated_at: new Date().toISOString(),
        diagnostics: {
            method: "heuristic",
            ai_assisted: false,
        },
    });
}
