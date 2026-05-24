import { NextResponse, type NextRequest } from "next/server";
import { validateStream } from "@/server/sensorFusion/providerRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const sourceUrl = typeof body.source_url === "string" ? body.source_url : "";
    const validation = await validateStream(sourceUrl);
    return NextResponse.json({
        validation,
        diagnostics: {
            playable: !!validation.playable_url || !!validation.embed_url,
            unavailable_reason: validation.ok
                ? null
                : validation.diagnostics.reason
                    ?? validation.health_status
                    ?? "validation_failed",
        },
    }, { status: validation.ok ? 200 : 422 });
}
