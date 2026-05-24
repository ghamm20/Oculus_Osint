import { NextResponse, type NextRequest } from "next/server";
import { getSensorScheduler } from "@/server/sensorFusion";
import { getSensorProvider } from "@/server/sensorFusion/providerRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: rawId } = await params;
    const id = decodeURIComponent(rawId);
    const scheduler = getSensorScheduler();
    scheduler.start();
    const entity = scheduler.getEntity(id);
    const provider = entity ? getSensorProvider(entity.provider) : undefined;
    const live = provider ? await provider.get_live_url(id) : null;
    const preview = {
        entity,
        live_url: live?.live_url ?? entity?.live_url ?? null,
        embed_url: live?.embed_url ?? entity?.embed_url ?? null,
        thumbnail_url: entity?.thumbnail_url ?? null,
        source_page_url: live?.source_page_url ?? entity?.source_page_url ?? null,
        requires_user_click: live?.requires_user_click ?? entity?.requires_user_click ?? true,
        legal_status: live?.legal_status ?? entity?.legal_status ?? "unknown",
        diagnostics: {
            ...(entity?.diagnostics ?? {}),
            ...(live?.diagnostics ?? {}),
        },
    };
    const playable = !!preview.live_url || !!preview.embed_url;
    return NextResponse.json({
        preview,
        diagnostics: {
            playable,
            unavailable_reason: playable
                ? null
                : preview.legal_status === "blocked"
                    ? "provider_blocked_or_auth_disallowed"
                    : preview.requires_user_click
                        ? "provider_requires_source_page_handoff"
                        : entity ? "stream_unavailable" : "stream_not_found",
        },
    }, { status: entity ? 200 : 404 });
}
