import { NextResponse, type NextRequest } from "next/server";
import { demoSnapshotSvg, resolveEntityFeed } from "@/server/sensorFusion/feedResolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, context: { params: Promise<{ entity_id: string }> }) {
    const { entity_id } = await context.params;
    const feed = await resolveEntityFeed(decodeURIComponent(entity_id));
    if (!feed) return NextResponse.json({ error: "Feed entity not found" }, { status: 404 });
    if (!feed.entity.diagnostics?.sample) {
        return NextResponse.json({
            error: "MJPEG demo route is only available for labeled ARGOS demo feeds.",
            entity_id: feed.entity_id,
            method: feed.method,
            status: feed.status,
        }, { status: 403 });
    }

    return new Response(demoSnapshotSvg(feed.entity), {
        headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "no-store",
            "X-ARGOS-Demo-Protocol": "mjpeg-image-refresh",
        },
    });
}
