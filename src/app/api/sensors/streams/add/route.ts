import { NextResponse, type NextRequest } from "next/server";
import { getSensorScheduler } from "@/server/sensorFusion";
import { addUserStreamToSensors, getSensorProvider } from "@/server/sensorFusion/providerRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function finiteOrNull(value: unknown): number | null {
    const numeric = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
    return Number.isFinite(numeric) ? numeric : null;
}

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const sourceUrl = typeof body.source_url === "string" ? body.source_url.trim() : "";
    const result = await addUserStreamToSensors({
        source_url: sourceUrl,
        title: typeof body.title === "string" ? body.title : undefined,
        lat: finiteOrNull(body.lat),
        lon: finiteOrNull(body.lon),
        tags: Array.isArray(body.tags) ? body.tags.filter((tag: unknown): tag is string => typeof tag === "string") : [],
    });

    const scheduler = getSensorScheduler();
    scheduler.start();
    const userStreams = getSensorProvider("user-streams");
    if (userStreams) await scheduler.refreshProvider(userStreams, true);

    const entity = result.stream ? scheduler.getEntity(result.stream.id) ?? null : null;
    const status = result.stream ? 201 : result.validation.ok ? 202 : 422;
    return NextResponse.json({
        stream: result.stream,
        entity,
        validation: result.validation,
        diagnostics: {
            stored_private_url: false,
            unavailable_reason: result.stream
                ? null
                : result.validation.diagnostics.reason
                    ?? result.validation.health_status
                    ?? "stream_not_registered",
        },
    }, { status });
}
