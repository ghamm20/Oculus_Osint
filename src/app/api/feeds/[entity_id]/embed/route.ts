import { NextResponse, type NextRequest } from "next/server";
import { resolveEntityFeed } from "@/server/sensorFusion/feedResolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function page(title: string, body: string): string {
    return `<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title}</title><style>html,body{margin:0;width:100%;height:100%;background:#020617;color:#e2e8f0;font-family:Arial,sans-serif}iframe,img,video{width:100%;height:100%;border:0;object-fit:contain}audio{width:92%;margin:20px}.msg{display:grid;place-items:center;height:100%;padding:24px;text-align:center}</style></head><body>${body}</body></html>`;
}

export async function GET(_req: NextRequest, context: { params: Promise<{ entity_id: string }> }) {
    const { entity_id } = await context.params;
    const feed = await resolveEntityFeed(decodeURIComponent(entity_id));
    if (!feed) return NextResponse.json({ error: "Feed entity not found" }, { status: 404 });

    let html: string | null = null;
    if (feed.method === "iframe_embed" && feed.embed_url) {
        html = page(feed.title, `<iframe src="${feed.embed_url}" title="${feed.title}" allow="fullscreen; autoplay; picture-in-picture"></iframe>`);
    } else if (feed.method === "snapshot_only" && feed.snapshot_url) {
        html = page(feed.title, `<img id="snapshot" src="${feed.snapshot_url}" alt="${feed.title}"/><script>setInterval(()=>{const img=document.getElementById('snapshot');img.src='${feed.snapshot_url}?t='+Date.now()},15000)</script>`);
    } else if ((feed.method === "hls_video" || feed.method === "mjpeg_video") && feed.live_url) {
        html = page(feed.title, `<video controls autoplay muted playsinline src="${feed.live_url}"></video>`);
    } else if (feed.method === "audio_stream" && feed.live_url) {
        html = page(feed.title, `<audio controls autoplay src="${feed.live_url}"></audio>`);
    }

    if (!html) {
        return NextResponse.json({
            error: "No embeddable feed available",
            status: feed.status,
            method: feed.method,
            failure_reason: feed.failure_reason,
            source_page_url: feed.source_page_url,
            diagnostics: feed.diagnostics,
        }, { status: 409 });
    }

    return new Response(html, {
        headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "no-store",
        },
    });
}
