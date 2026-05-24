import { NextResponse, type NextRequest } from "next/server";
import { listRegisteredStreams, registerStream, registeredStreamToEntity } from "@/server/liveSources/streamRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
    const streams = listRegisteredStreams();
    return NextResponse.json({
        streams,
        items: streams.map(registeredStreamToEntity),
        total: streams.length,
    });
}

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const source_url = typeof body.source_url === "string" ? body.source_url : "";
    const title = typeof body.title === "string" ? body.title : undefined;
    const lat = typeof body.lat === "number" ? body.lat : null;
    const lon = typeof body.lon === "number" ? body.lon : null;
    const tags = Array.isArray(body.tags) ? body.tags.filter((tag: unknown): tag is string => typeof tag === "string") : [];

    const { stream, validation } = await registerStream({ source_url, title, lat, lon, tags });
    if (!stream) {
        return NextResponse.json({ stream: null, validation }, { status: validation.health_status === "auth_failed" ? 400 : 422 });
    }

    return NextResponse.json({
        stream,
        item: registeredStreamToEntity(stream),
        validation,
    });
}
