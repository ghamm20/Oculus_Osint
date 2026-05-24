import { NextResponse, type NextRequest } from "next/server";
import { demoSnapshotSvg, resolveEntityFeed } from "@/server/sensorFusion/feedResolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, context: { params: Promise<{ entity_id: string }> }) {
    const { entity_id } = await context.params;
    const feed = await resolveEntityFeed(decodeURIComponent(entity_id));
    if (!feed) return NextResponse.json({ error: "Feed entity not found" }, { status: 404 });
    if (feed.entity.diagnostics?.sample && !!feed.snapshot_url && (feed.source_type === "webcam" || feed.source_type === "traffic_camera")) {
        return new Response(demoSnapshotSvg(feed.entity), {
            headers: {
                "Content-Type": "image/svg+xml; charset=utf-8",
                "Cache-Control": "no-store",
            },
        });
    }
    const target = feed.thumbnail_url ?? (feed.method === "snapshot_only" ? feed.live_url : null);
    if (target) return NextResponse.redirect(target);
    return NextResponse.json({
        error: "No snapshot available",
        status: feed.status,
        method: feed.method,
        failure_reason: feed.failure_reason,
        diagnostics: feed.diagnostics,
    }, { status: 404 });
}
