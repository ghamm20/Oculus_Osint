import { NextResponse } from "next/server";
import { liveSourceProviders } from "@/server/liveSources/providers";
import { checkProviders } from "@/server/liveSources/healthMonitor";
import { aiAnalysisPipeline } from "@/server/liveSources/aiAnalysisPipeline";
import { recordingManager } from "@/server/liveSources/recordingManager";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const providers = await checkProviders(liveSourceProviders);
    return NextResponse.json({
        providers,
        summary: {
            total: providers.length,
            healthy: providers.filter((provider) => provider.status === "healthy").length,
            api_required: providers.filter((provider) => provider.status === "api_required").length,
            blocked: providers.filter((provider) => provider.status === "blocked").length,
            unavailable: providers.filter((provider) => provider.status === "unavailable").length,
        },
        core_services: {
            stream_registry: "active",
            stream_validator: "active",
            protocol_adapter: "active",
            thumbnail_worker: "catalog_only",
            geo_mapper: "active",
            health_monitor: "active",
            live_mux: "no_proxy_direct_or_source_handoff",
            recording_manager: recordingManager,
            ai_analysis_pipeline: aiAnalysisPipeline,
        },
        checked_at: new Date().toISOString(),
    });
}
