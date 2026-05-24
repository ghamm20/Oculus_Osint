import { NextResponse, type NextRequest } from "next/server";
import { providerPlayableSummary, resolverClassSummary, resolveAllFeeds } from "@/server/sensorFusion/feedResolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VIDEO_TYPES = new Set(["webcam", "traffic_camera", "generic_stream", "manual"]);

export async function GET(req: NextRequest) {
    const onlyPlayable = req.nextUrl.searchParams.get("only_playable") === "1";
    let feeds = (await resolveAllFeeds()).filter((feed) => VIDEO_TYPES.has(feed.source_type));
    if (onlyPlayable) feeds = feeds.filter((feed) => feed.status === "playable");
    return NextResponse.json({
        feeds,
        total: feeds.length,
        playable: feeds.filter((feed) => feed.status === "playable").length,
        providers: providerPlayableSummary(feeds),
        classes: resolverClassSummary(feeds),
        generated_at: new Date().toISOString(),
        diagnostics: {
            only_playable: onlyPlayable,
            no_playable_feeds: feeds.filter((feed) => feed.status === "playable").length === 0,
        },
    });
}
