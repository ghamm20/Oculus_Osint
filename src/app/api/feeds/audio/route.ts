import { NextResponse } from "next/server";
import { providerPlayableSummary, resolverClassSummary, resolveAllFeeds } from "@/server/sensorFusion/feedResolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const feeds = (await resolveAllFeeds()).filter((feed) => feed.source_type === "audio");
    return NextResponse.json({
        feeds,
        total: feeds.length,
        playable: feeds.filter((feed) => feed.status === "playable").length,
        source_page_only: feeds.filter((feed) => feed.status === "source-page-only" || feed.status === "api-required").length,
        providers: providerPlayableSummary(feeds),
        classes: resolverClassSummary(feeds),
        generated_at: new Date().toISOString(),
    });
}
