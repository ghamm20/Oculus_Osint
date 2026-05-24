import { NextResponse, type NextRequest } from "next/server";
import { resolveEntityFeed } from "@/server/sensorFusion/feedResolver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function demoToneWav(): Buffer {
    const sampleRate = 8000;
    const seconds = 1.2;
    const sampleCount = Math.floor(sampleRate * seconds);
    const dataSize = sampleCount * 2;
    const buffer = Buffer.alloc(44 + dataSize);

    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(1, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(sampleRate * 2, 28);
    buffer.writeUInt16LE(2, 32);
    buffer.writeUInt16LE(16, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataSize, 40);

    for (let index = 0; index < sampleCount; index += 1) {
        const envelope = Math.min(1, index / 600, (sampleCount - index) / 600);
        const value = Math.round(Math.sin((index / sampleRate) * 2 * Math.PI * 440) * 0x3fff * envelope);
        buffer.writeInt16LE(value, 44 + index * 2);
    }

    return buffer;
}

export async function GET(_req: NextRequest, context: { params: Promise<{ entity_id: string }> }) {
    const { entity_id } = await context.params;
    const feed = await resolveEntityFeed(decodeURIComponent(entity_id));
    if (!feed) return NextResponse.json({ error: "Feed entity not found" }, { status: 404 });
    if (!feed.entity.diagnostics?.sample || feed.source_type !== "audio") {
        return NextResponse.json({
            error: "Audio demo route is only available for labeled ARGOS demo audio feeds.",
            entity_id: feed.entity_id,
            method: feed.method,
            status: feed.status,
        }, { status: 403 });
    }

    const audio = demoToneWav();
    const body = audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) as ArrayBuffer;
    return new Response(body, {
        headers: {
            "Content-Type": "audio/wav",
            "Cache-Control": "no-store",
            "X-ARGOS-Demo-Protocol": "audio-stream",
        },
    });
}
