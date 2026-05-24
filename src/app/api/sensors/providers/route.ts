import { NextResponse } from "next/server";
import { getSensorScheduler } from "@/server/sensorFusion";
import { listSensorProviders } from "@/server/sensorFusion/providerRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const scheduler = getSensorScheduler();
    scheduler.start();
    const healthById = new Map(scheduler.getHealth().map((health) => [health.provider_id, health]));
    return NextResponse.json({
        providers: listSensorProviders().map((provider) => ({
            provider_id: provider.provider_id,
            display_name: provider.display_name,
            source_type: provider.source_type,
            requires_api_key: provider.requires_api_key,
            terms_url: provider.terms_url,
            min_refresh_seconds: provider.min_refresh_seconds,
            rate_limit_policy: provider.rate_limit_policy,
            failure_policy: provider.failure_policy,
            health: healthById.get(provider.provider_id) ?? null,
        })),
    });
}
