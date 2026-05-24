import { NextResponse } from "next/server";
import { getSensorScheduler } from "@/server/sensorFusion";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const scheduler = getSensorScheduler();
    scheduler.start();
    const providers = scheduler.getHealth();
    return NextResponse.json({
        providers,
        summary: {
            total: providers.length,
            healthy: providers.filter((provider) => provider.health === "healthy").length,
            degraded: providers.filter((provider) => provider.health === "degraded" || provider.health === "zero_entities").length,
            api_required: providers.filter((provider) => provider.health === "api_required").length,
            blocked: providers.filter((provider) => provider.health === "blocked").length,
            unavailable: providers.filter((provider) => provider.health === "unavailable").length,
            stale: providers.reduce((sum, provider) => sum + provider.stale_count, 0),
        },
        scheduler: {
            nrt: true,
            transport: "sse",
            analysis_interval_seconds: 15,
        },
        checked_at: new Date().toISOString(),
    });
}
