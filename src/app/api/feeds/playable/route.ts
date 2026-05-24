import { NextResponse, type NextRequest } from "next/server";
import { providerPlayableSummary, resolverClassSummary, resolveAllFeeds } from "@/server/sensorFusion/feedResolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const includeSourcePage = req.nextUrl.searchParams.get("include_source_page") === "1";
    const includeAll = req.nextUrl.searchParams.get("include_all") === "1";
    const feeds = await resolveAllFeeds();
    const playable = includeAll
        ? feeds
        : feeds.filter((feed) => feed.status === "playable" || (includeSourcePage && feed.viewable));
    return NextResponse.json({
        feeds: playable,
        total: playable.length,
        providers: providerPlayableSummary(feeds),
        classes: resolverClassSummary(feeds),
        playable_by_class: resolverClassSummary(playable),
        generated_at: new Date().toISOString(),
        diagnostics: {
            no_playable_feeds: playable.length === 0,
            filter: includeAll ? "all_resolver_classes" : includeSourcePage ? "playable_or_source_page" : "playable_only",
        },
    });
}
