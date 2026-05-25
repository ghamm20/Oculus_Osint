import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isDemo } from "@/core/edition";

const workspaceCache = new Map<string, { status: string; expiresAt: number }>();
const CACHE_TTL = 60_000; // 60 seconds

async function resolveWorkspace(subdomain: string) {
    const cached = workspaceCache.get(subdomain);
    if (cached && Date.now() < cached.expiresAt) return cached;
    
    try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || `http://127.0.0.1:${process.env.PORT || "3000"}`;
        const url = new URL(`/api/internal/workspace/${subdomain}`, appUrl);
        const res = await fetch(url.toString(), {
            headers: { "User-Agent": "Oculus0Osint-Middleware" }
        });
        
        if (res.ok) {
            const data = await res.json();
            workspaceCache.set(subdomain, { ...data, expiresAt: Date.now() + CACHE_TTL });
            return data;
        }
        return null;
    } catch (e) {
        console.error("[proxy.ts] Workspace resolution failed:", e);
        return null;
    }
}

/**
 * Route protection proxy.
 * - /setup, /login, /api/* → public
 * - Everything else → requires valid JWT session
 * - If no users exist → redirect to /setup
 * - Demo edition → everything is public (no login required)
 */
export default async function proxy(req: NextRequest) {
    const path = req.nextUrl.pathname;
    
    // Tenant subdomain extraction — dormant in this fork's local edition.
    // Kept as an architectural hook for future ARGOS coupling (per the
    // Phase-2/3/4 reports the coupling decision is still owner-pending).
    // Cloud edition was the prior caller of this code; post-Phase-5
    // cloud has no distinct behavior in this fork, so the gate is removed
    // and tenant extraction simply never finds a subdomain on localhost.
    const hostname = req.headers.get("host") || "";
    let tenantSubdomain = null;
    const isCloudDeploy = process.env.NEXT_PUBLIC_WWV_EDITION === "cloud";

    if (isCloudDeploy) {
        // Tenant subdomain pattern is .app.<host>; this fork retains the
        // matcher in case ARGOS or a downstream cloud deploy reintroduces
        // multi-tenancy. The hardcoded WWV apex host has been replaced
        // with a generic ".app." match so this fork doesn't reference
        // upstream WWV branding at runtime.
        if (hostname.includes(".app.") || hostname.includes(".localhost")) {
            const subdomain = hostname
                .replace(/\.app\.[^.:]+(\.[^.:]+)*/, "")
                .replace(".localhost", "")
                .split(":")[0];
            if (subdomain && subdomain !== "app" && subdomain !== "localhost") {
                tenantSubdomain = subdomain;
            }
        }
    }

    // Demo edition: fully public, no auth required
    if (isDemo) {
        const res = NextResponse.next();
        if (tenantSubdomain) res.headers.set("x-tenant-subdomain", tenantSubdomain);
        return res;
    }

    // Static assets, API routes, data files — always pass through.
    // /wwv-mirror is the Phase 2 plugin mirror: the manifest URLs are
    // extension-less by design (they mirror the upstream API shape), so the
    // path.includes(".") catch-all doesn't trigger. Whitelist explicitly.
    if (
        path.startsWith("/_next") ||
        path.startsWith("/api") ||
        path.startsWith("/data") ||
        path.startsWith("/cesium") ||
        path.startsWith("/wwv-mirror") ||
        path.includes(".")
    ) {
        const res = NextResponse.next();
        if (tenantSubdomain) res.headers.set("x-tenant-subdomain", tenantSubdomain);
        return res;
    }

    // Tenant validation
    if (isCloudDeploy && tenantSubdomain) {
        const workspaceInfo = await resolveWorkspace(tenantSubdomain);
        if (!workspaceInfo) {
            // Workspace not found
            return new NextResponse("Workspace not found", { status: 404 });
        }
        if (workspaceInfo.status === "suspended" && !path.startsWith("/suspended")) {
            return NextResponse.redirect(new URL("/suspended", req.url));
        }
    }



    // Auth pages — always accessible
    if (path.startsWith("/setup") || path.startsWith("/login")) {
        const res = NextResponse.next();
        if (tenantSubdomain) res.headers.set("x-tenant-subdomain", tenantSubdomain);
        return res;
    }

    // Apex-domain marketing redirect to worldwideview.dev/hub was here
    // (Phase 6 removed it). This fork's local edition has no marketing
    // hub to redirect to; a cloud deploy of this fork would want its own
    // apex behavior, set via env or middleware override rather than
    // hardcoded WWV branding. Owner adds back as needed.

    // Check JWT session from Auth.js cookie.
    // Behind a TLS-terminating reverse proxy, the cookie was set with the
    // `__Secure-` prefix (because the public URL is https), but the request
    // reaching us is plain http, so getToken's auto-detection looks for the
    // unprefixed name and misses it. Detect via X-Forwarded-Proto / AUTH_URL.
    const xfProto = req.headers.get("x-forwarded-proto");
    const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "";
    const isSecure = xfProto === "https"
        || authUrl.startsWith("https://")
        || req.nextUrl.protocol === "https:";
    const token = await getToken({
        req,
        secret: process.env.AUTH_SECRET,
        secureCookie: isSecure,
    });

    if (token) {
        // User is logged in — allow through
        const res = NextResponse.next();
        if (tenantSubdomain) res.headers.set("x-tenant-subdomain", tenantSubdomain);
        return res;
    }

    // Not logged in — check if first-run (no users)
    try {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || `http://127.0.0.1:${process.env.PORT || "3000"}`;
        const url = new URL("/api/auth/setup-status", appUrl);
        const res = await fetch(url.toString(), {
            headers: {
                "User-Agent": "Oculus0Osint-Middleware",
            }
        });
        const data = await res.json();
        if (data.needsSetup) {
            return NextResponse.redirect(new URL("/setup", req.nextUrl)); // NextResponse.redirect correctly bounds redirect to client
        }
    } catch (e) {
        // Fall through to login redirect
        console.error("[proxy.ts] Failed to fetch setup status:", e);
    }

    return NextResponse.redirect(new URL("/login", req.nextUrl));
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

