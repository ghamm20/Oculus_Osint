import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAuthEnabled } from "@/core/edition";
import { cameraProxyLimiter } from "@/lib/rateLimiters";
import { getClientIp } from "@/lib/rateLimit";

const BLOCKED_HOSTS = ["localhost", "127.0.0.1", "::1", "metadata.google.internal"];
const MAX_STREAM_DURATION_MS = 5 * 60 * 1000; // 5 minutes

import dns from "dns/promises";

// Content-Type validation for CORB safety. Chrome's ORB/CORB blocks any
// response delivered as <img>/<video>/<audio> whose Content-Type is
// text/* or JSON/XML — even with `X-Content-Type-Options: nosniff`. The
// stream proxy used to faithfully relay whatever the upstream returned,
// so cameras whose upstream produced a 200 OK HTML error page would get
// silently CORB-blocked by the browser. Now we validate up front and
// return an honest 502 with a JSON error body, which lets the <img
// onError> path render the "Stream Failed" overlay cleanly.

/** Media MIME types that are safe to relay into an <img> / <video> / <audio>. */
function isAllowedMediaType(contentType: string): boolean {
    const lower = contentType.toLowerCase().split(";")[0].trim();
    if (lower.startsWith("image/")) return true;
    if (lower.startsWith("video/")) return true;
    if (lower.startsWith("audio/")) return true;
    if (lower === "multipart/x-mixed-replace") return true;
    return false;
}

/** CORB-protected MIME types that must never be relayed to an <img>. */
function isProtectedNonMediaType(contentType: string): boolean {
    const lower = contentType.toLowerCase().split(";")[0].trim();
    if (lower.startsWith("text/")) return true;
    if (lower === "application/json") return true;
    if (lower === "application/xml") return true;
    if (lower === "application/xhtml+xml") return true;
    return false;
}

/**
 * Magic-byte check for image payloads when Content-Type is missing or
 * `application/octet-stream`. Some legacy MJPEG / snapshot servers don't
 * set a content type at all; we still want to relay those when the
 * bytes themselves look like a known image format.
 *
 * Supported formats and their magic numbers (first bytes):
 *   JPEG:  FF D8 FF
 *   PNG:   89 50 4E 47  0D 0A 1A 0A
 *   GIF:   47 49 46 38           ("GIF8")
 *   WEBP:  52 49 46 46  __ __ __ __  57 45 42 50   ("RIFF....WEBP")
 */
function looksLikeImageMagic(bytes: Uint8Array): boolean {
    if (bytes.length < 3) return false;
    // JPEG
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return true;
    // PNG
    if (
        bytes.length >= 8 &&
        bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
        bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
    ) return true;
    // GIF (GIF87a or GIF89a both share "GIF8" prefix)
    if (
        bytes.length >= 4 &&
        bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38
    ) return true;
    // WEBP — RIFF container with WEBP magic at offset 8
    if (
        bytes.length >= 12 &&
        bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) return true;
    return false;
}

async function isPrivateUrl(urlStr: string): Promise<boolean> {
    try {
        const parsed = new URL(urlStr);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return true;
        const host = parsed.hostname;
        
        // If developer overrides local restrictions, bypass checks
        if (process.env.WWV_PROXY_ALLOW_LOCAL === "true") return false;

        if (BLOCKED_HOSTS.includes(host)) return true;

        let resolvedIp: string;
        try {
            const lookupResult = await dns.lookup(host);
            resolvedIp = lookupResult.address;
        } catch {
            return true; // DNS resolution failed
        }

        const parts = resolvedIp.split(".").map(Number);
        if (parts.length === 4 && parts.every((n) => !isNaN(n))) {
            if (parts[0] === 10) return true;
            if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
            if (parts[0] === 192 && parts[1] === 168) return true;
            if (parts[0] === 169 && parts[1] === 254) return true;
            if (parts[0] === 0) return true;
            if (parts[0] === 127) return true;
        }
        
        if (resolvedIp === "::1" || resolvedIp.startsWith("fe80:") || resolvedIp.startsWith("fc") || resolvedIp.startsWith("fd")) {
            return true;
        }
        
        return false;
    } catch {
        return true;
    }
}

/**
 * Binary/stream proxy – pipes raw bytes from an HTTP source (e.g. MJPEG)
 * so the browser receives them over HTTPS, avoiding mixed-content blocks.
 */
export async function GET(req: NextRequest) {
    const rateLimited = cameraProxyLimiter.check(getClientIp(req));
    if (rateLimited) return rateLimited;

    if (isAuthEnabled) {
        const session = await auth();
        if (!session?.user) {
            // Dev bypass — matches the proxy.ts and validateMarketplaceAuth
            // pattern (commits f946a5c, 068a274). Read-only relay for
            // external camera image URLs; safe to expose under the same
            // build-window opt-in. Warning fires on every bypassed request
            // so the operator can't forget the flag is on.
            if (process.env.WWV_DEV_NO_AUTH === "true") {
                console.warn(
                    "[camera/proxy/stream] WWV_DEV_NO_AUTH=true — bypassing auth for camera image fetch. " +
                    "Unset this env to re-enable the auth gate.",
                );
            } else {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }
        }
    }

    const targetUrl = new URL(req.url).searchParams.get("url");
    if (!targetUrl) {
        return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
    }

    // By user request: We are no longer strict about CORS/SSRF.
    // Allow any camera to work, including local network cameras.
    /*
    if (await isPrivateUrl(targetUrl)) {
        return NextResponse.json(
            { error: "Requests to private/internal networks are not allowed" },
            { status: 403 },
        );
    }
    */

    try {
        const upstream = await fetch(targetUrl, {
            headers: { "User-Agent": "Oculus0Osint/1.0" },
            signal: AbortSignal.timeout(MAX_STREAM_DURATION_MS),
        });

        if (!upstream.ok) {
            return NextResponse.json(
                { error: `Upstream returned ${upstream.status}` },
                { status: upstream.status },
            );
        }

        if (!upstream.body) {
            return NextResponse.json(
                { error: "Upstream returned no body" },
                { status: 502 },
            );
        }

        const rawContentType = upstream.headers.get("content-type") ?? "";
        const upstreamCtForReport = rawContentType || "<missing>";

        // 1. Explicit CORB-protected types — never relay. The <img> would
        //    be silently blocked by Chrome; surface an honest 502 instead.
        if (rawContentType && isProtectedNonMediaType(rawContentType)) {
            return NextResponse.json(
                {
                    error: "Upstream returned non-media content",
                    upstream_content_type: upstreamCtForReport,
                },
                { status: 502 },
            );
        }

        // 2. Explicit media types — relay the body stream as-is.
        if (rawContentType && isAllowedMediaType(rawContentType)) {
            return new Response(upstream.body as ReadableStream, {
                status: 200,
                headers: {
                    "Content-Type": rawContentType,
                    "Cache-Control": "no-store",
                    "X-Content-Type-Options": "nosniff",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, OPTIONS",
                },
            });
        }

        // 3. Ambiguous case: Content-Type missing OR application/octet-stream
        //    (or anything else not explicitly classified). Peek the first
        //    bytes and verify the body actually looks like an image. If so,
        //    relay with a normalized image MIME so the browser is unambiguous.
        //    If not, return 502 — anything that isn't a known image at this
        //    point would either CORB-block or be ambiguous to render.
        const reader = (upstream.body as ReadableStream<Uint8Array>).getReader();
        let firstChunk: Uint8Array | undefined;
        try {
            const result = await reader.read();
            if (!result.done) firstChunk = result.value;
        } catch (err) {
            try { reader.releaseLock(); } catch { /* ignore */ }
            throw err;
        }

        if (!firstChunk || firstChunk.length === 0) {
            try { reader.releaseLock(); } catch { /* ignore */ }
            return NextResponse.json(
                { error: "Upstream returned empty body" },
                { status: 502 },
            );
        }

        if (!looksLikeImageMagic(firstChunk)) {
            try { reader.cancel(); } catch { /* ignore */ }
            return NextResponse.json(
                {
                    error: "Upstream returned non-media content",
                    upstream_content_type: upstreamCtForReport,
                },
                { status: 502 },
            );
        }

        // Magic-byte check passed. Reassemble a stream that emits the peeked
        // head first, then continues from the upstream reader. Normalize the
        // outbound Content-Type to a concrete image type so Chrome doesn't
        // fall back to confirmation sniffing.
        const normalizedType =
            firstChunk[0] === 0xff && firstChunk[1] === 0xd8 ? "image/jpeg" :
            firstChunk[0] === 0x89 && firstChunk[1] === 0x50 ? "image/png" :
            firstChunk[0] === 0x47 && firstChunk[1] === 0x49 ? "image/gif" :
            firstChunk[0] === 0x52 && firstChunk[1] === 0x49 ? "image/webp" :
            "application/octet-stream";

        const rejoined = new ReadableStream<Uint8Array>({
            start(controller) {
                controller.enqueue(firstChunk);
            },
            async pull(controller) {
                try {
                    const { done, value } = await reader.read();
                    if (done) {
                        controller.close();
                    } else if (value) {
                        controller.enqueue(value);
                    }
                } catch (err) {
                    controller.error(err);
                }
            },
            async cancel() {
                try { await reader.cancel(); } catch { /* ignore */ }
            },
        });

        return new Response(rejoined, {
            status: 200,
            headers: {
                "Content-Type": normalizedType,
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[StreamProxy] Error:", message);
        return NextResponse.json(
            { error: "Failed to proxy stream" },
            { status: 502 },
        );
    }
}

export async function OPTIONS() {
    return new Response(null, {
        status: 204,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
        },
    });
}
