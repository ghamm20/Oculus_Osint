import type { StreamCapabilities, StreamProtocol, StreamValidationResult } from "./types";
import { nowIso, withTimeout } from "./utils";

const SENSITIVE_QUERY_KEYS = [
    "token",
    "key",
    "api_key",
    "apikey",
    "signature",
    "sig",
    "auth",
    "password",
    "passwd",
    "secret",
    "session",
];

function defaultCapabilities(protocol: StreamProtocol): StreamCapabilities {
    const browserPlayable = ["hls", "mjpeg", "snapshot", "iframe", "youtube"].includes(protocol);
    return {
        browser_playable: browserPlayable,
        needs_external_player: ["rtsp", "rtmp", "onvif", "vlc", "webrtc"].includes(protocol),
        can_embed: ["iframe", "youtube"].includes(protocol),
        can_snapshot: ["snapshot", "mjpeg", "hls"].includes(protocol),
        can_record: false,
        can_analyze: browserPlayable,
        low_bandwidth: ["snapshot", "mjpeg"].includes(protocol),
        notes: [],
    };
}

export function detectProtocol(rawUrl: string): StreamProtocol {
    const value = rawUrl.trim().toLowerCase();
    if (value.startsWith("rtsp://")) return "rtsp";
    if (value.startsWith("rtmp://")) return "rtmp";
    if (value.startsWith("onvif://") || value.includes("/onvif")) return "onvif";
    if (value.startsWith("webrtc://") || value.endsWith(".sdp")) return "webrtc";
    if (value.startsWith("vlc://")) return "vlc";
    if (value.includes("youtube.com/watch") || value.includes("youtu.be/") || value.includes("youtube.com/embed/")) return "youtube";
    if (value.endsWith(".m3u8") || value.includes(".m3u8?")) return "hls";
    if (value.includes("mjpeg") || value.includes(".mjpg") || value.includes("axis-cgi/mjpg")) return "mjpeg";
    if (value.endsWith(".jpg") || value.endsWith(".jpeg") || value.endsWith(".png") || value.endsWith(".webp") || value.includes("snapshot")) return "snapshot";
    if (value.startsWith("<iframe") || value.includes("/embed/")) return "iframe";
    return "unknown";
}

function normalizeYoutubeEmbed(rawUrl: string): string | null {
    try {
        const url = new URL(rawUrl);
        if (url.hostname.includes("youtu.be")) {
            const id = url.pathname.replace("/", "");
            return id ? `https://www.youtube.com/embed/${id}` : null;
        }
        if (url.pathname.includes("/embed/")) return url.toString();
        const id = url.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
    } catch {
        return null;
    }
}

function hasSensitiveAuth(rawUrl: string): boolean {
    try {
        const url = new URL(rawUrl);
        if (url.username || url.password) return true;
        for (const key of SENSITIVE_QUERY_KEYS) {
            if (url.searchParams.has(key)) return true;
        }
        return false;
    } catch {
        return false;
    }
}

async function probeHttp(rawUrl: string): Promise<{ ok: boolean; status?: number; contentType?: string; error?: string }> {
    try {
        const res = await withTimeout(
            "stream probe",
            fetch(rawUrl, {
                method: "HEAD",
                headers: { "User-Agent": "Oculus0Osint-ARGOS/1.0" },
                redirect: "follow",
            }),
            6000,
        );
        return {
            ok: res.ok,
            status: res.status,
            contentType: res.headers.get("content-type") ?? undefined,
        };
    } catch (err: any) {
        return { ok: false, error: err?.message ?? String(err) };
    }
}

export async function validateStream(rawUrl: string): Promise<StreamValidationResult> {
    const source_url = rawUrl.trim();
    const protocol = detectProtocol(source_url);
    const auth_required = hasSensitiveAuth(source_url);
    const capabilities = defaultCapabilities(protocol);
    const diagnostics: Record<string, unknown> = {
        checked_at: nowIso(),
        protocol,
        proxy: "disabled",
        recording: "disabled_until_explicitly_configured",
    };

    if (!source_url) {
        return {
            ok: false,
            protocol: "unknown",
            source_url,
            playable_url: null,
            embed_url: null,
            thumbnail_url: null,
            auth_required: false,
            health_status: "offline",
            refresh_rate: 60,
            capabilities_json: { ...capabilities, notes: ["empty_url"] },
            diagnostics,
        };
    }

    if (auth_required) {
        return {
            ok: false,
            protocol,
            source_url,
            playable_url: null,
            embed_url: null,
            thumbnail_url: null,
            auth_required: true,
            health_status: "auth_failed",
            refresh_rate: 60,
            capabilities_json: { ...capabilities, notes: [...capabilities.notes, "auth_like_url_not_stored"] },
            diagnostics: { ...diagnostics, reason: "URL contains credentials or token-like query params" },
        };
    }

    if (["rtsp", "rtmp", "onvif", "webrtc", "vlc"].includes(protocol)) {
        return {
            ok: true,
            protocol,
            source_url,
            playable_url: null,
            embed_url: null,
            thumbnail_url: null,
            auth_required: false,
            health_status: "degraded",
            refresh_rate: 30,
            capabilities_json: { ...capabilities, notes: [...capabilities.notes, "external_player_or_adapter_required"] },
            diagnostics,
        };
    }

    const embed_url = protocol === "youtube" ? normalizeYoutubeEmbed(source_url) : protocol === "iframe" ? source_url : null;
    const playable_url = ["hls", "mjpeg", "snapshot"].includes(protocol) ? source_url : null;
    const thumbnail_url = protocol === "snapshot" ? source_url : null;
    const shouldProbe = source_url.startsWith("http://") || source_url.startsWith("https://");
    const probe = shouldProbe ? await probeHttp(source_url) : { ok: protocol === "iframe" || protocol === "youtube" };

    return {
        ok: protocol !== "unknown" && (probe.ok || protocol === "youtube" || protocol === "iframe"),
        protocol,
        source_url,
        playable_url,
        embed_url,
        thumbnail_url,
        auth_required: false,
        health_status: protocol === "unknown"
            ? "unsupported_codec"
            : probe.ok || protocol === "youtube" || protocol === "iframe"
                ? "online"
                : "stream_timeout",
        refresh_rate: protocol === "snapshot" ? 15 : 30,
        capabilities_json: {
            ...capabilities,
            notes: protocol === "unknown" ? ["unsupported_or_unknown_protocol"] : capabilities.notes,
        },
        diagnostics: { ...diagnostics, probe },
    };
}
