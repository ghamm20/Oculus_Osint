import type { ArgosEntity, RegisteredStream, StreamValidationResult } from "./types";
import { nowIso } from "./utils";
import { validateStream } from "./streamValidator";

const streams = new Map<string, RegisteredStream>();

function streamType(protocol: RegisteredStream["protocol"]): ArgosEntity["type"] {
    if (protocol === "rtsp" || protocol === "rtmp" || protocol === "hls" || protocol === "mjpeg" || protocol === "snapshot" || protocol === "onvif" || protocol === "webrtc" || protocol === "youtube") {
        return "webcam";
    }
    return "webcam";
}

function streamId(sourceUrl: string): string {
    let hash = 0;
    for (let i = 0; i < sourceUrl.length; i += 1) {
        hash = ((hash << 5) - hash + sourceUrl.charCodeAt(i)) | 0;
    }
    return `user-stream:${Math.abs(hash).toString(36)}`;
}

export function listRegisteredStreams(): RegisteredStream[] {
    return Array.from(streams.values());
}

export async function registerStream(input: {
    source_url: string;
    title?: string;
    lat?: number | null;
    lon?: number | null;
    tags?: string[];
}): Promise<{ stream: RegisteredStream | null; validation: StreamValidationResult }> {
    const validation = await validateStream(input.source_url);
    if (!validation.ok && validation.health_status === "auth_failed") {
        return { stream: null, validation };
    }

    const id = streamId(input.source_url);
    const stream: RegisteredStream = {
        id,
        title: input.title?.trim() || `ARGOS ${validation.protocol.toUpperCase()} stream`,
        protocol: validation.protocol,
        source_url: validation.auth_required ? "" : input.source_url.trim(),
        thumbnail_url: validation.thumbnail_url,
        lat: typeof input.lat === "number" && Number.isFinite(input.lat) ? input.lat : null,
        lon: typeof input.lon === "number" && Number.isFinite(input.lon) ? input.lon : null,
        tags: Array.isArray(input.tags) ? input.tags.map((tag) => tag.trim()).filter(Boolean).slice(0, 12) : [],
        provider: "user-streams",
        auth_required: validation.auth_required,
        refresh_rate: validation.refresh_rate,
        health_status: validation.health_status,
        last_seen: nowIso(),
        capabilities_json: validation.capabilities_json,
    };

    streams.set(id, stream);
    return { stream, validation };
}

export function registeredStreamToEntity(stream: RegisteredStream): ArgosEntity {
    const canPlay = stream.capabilities_json.browser_playable && !!stream.source_url;
    const isEmbed = stream.capabilities_json.can_embed;
    return {
        id: stream.id,
        provider: stream.provider,
        type: streamType(stream.protocol),
        title: stream.title,
        description: `User-added ${stream.protocol.toUpperCase()} stream`,
        lat: stream.lat,
        lon: stream.lon,
        city: null,
        state: null,
        country: null,
        thumbnail_url: stream.thumbnail_url,
        live_url: canPlay && !isEmbed ? stream.source_url : null,
        embed_url: canPlay && isEmbed ? stream.source_url : null,
        source_page_url: stream.source_url || "about:blank",
        refresh_seconds: stream.refresh_rate,
        requires_user_click: !canPlay,
        legal_status: stream.auth_required ? "blocked" : "unknown",
        last_checked: stream.last_seen,
        diagnostics: {
            protocol: stream.protocol,
            health_status: stream.health_status,
            capabilities: stream.capabilities_json,
            tags: stream.tags,
        },
    };
}
