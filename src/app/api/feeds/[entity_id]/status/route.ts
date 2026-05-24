import { NextResponse, type NextRequest } from "next/server";
import { resolveEntityFeed } from "@/server/sensorFusion/feedResolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, context: { params: Promise<{ entity_id: string }> }) {
    const { entity_id } = await context.params;
    const feed = await resolveEntityFeed(decodeURIComponent(entity_id));
    if (!feed) return NextResponse.json({ error: "Feed entity not found" }, { status: 404 });
    return NextResponse.json({
        entity_id: feed.entity_id,
        method: feed.method,
        status: feed.status,
        playable: feed.playable,
        viewable: feed.viewable,
        failure_reason: feed.failure_reason,
        diagnostics: feed.diagnostics,
        generated_at: new Date().toISOString(),
    });
}
