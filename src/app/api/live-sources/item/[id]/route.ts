import { NextResponse, type NextRequest } from "next/server";
import { findLiveSourceItem } from "@/server/liveSources/catalog";
import { getProvider } from "@/server/liveSources/providers";
import { resolveLiveAction } from "@/server/liveSources/liveMux";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const item = await findLiveSourceItem(decodeURIComponent(id));
    if (!item) {
        return NextResponse.json({ error: "ARGOS live-source item not found" }, { status: 404 });
    }

    const provider = getProvider(item.provider);
    const live = provider ? await provider.get_live_url(item.id) : {
        live_url: item.live_url,
        embed_url: item.embed_url,
        source_page_url: item.source_page_url,
        requires_user_click: item.requires_user_click,
        legal_status: item.legal_status,
        diagnostics: item.diagnostics,
    };

    return NextResponse.json({
        item,
        live,
        action: resolveLiveAction({ ...item, ...live }),
    });
}
