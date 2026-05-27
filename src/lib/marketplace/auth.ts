import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { verifyMarketplaceToken } from "./marketplaceToken";
import { isDemo, isDemoAdmin } from "@/core/edition";

/**
 * Validate marketplace API access. Accepts (in order):
 *   1. Active Auth.js session (browser redirect flow)
 *   2. Marketplace JWT issued at install time (cross-origin Manage page)
 *   3. (Read-only callers, opt-in) — WWV_DEV_NO_AUTH dev bypass
 *
 * Returns null if authorized, or a NextResponse error if not.
 *
 * The `allowDevBypass` option must be set explicitly by callers that are
 * safe to expose under WWV_DEV_NO_AUTH=true. It is honored only for
 * read-only endpoints (load, status) where the worst case is that an
 * unauthenticated browser sees the same plugin list it would see after
 * login. It is intentionally NOT honored from write endpoints (install,
 * uninstall) — those stay gated even when WWV_DEV_NO_AUTH is set.
 */
export async function validateMarketplaceAuth(
    request: Request,
    options: { allowDevBypass?: boolean } = {},
): Promise<NextResponse | null> {
    // 1. Try session auth first
    const session = await auth();
    if (session?.user) {
        if (isDemo && !isDemoAdmin(session)) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }
        return null;
    }

    // 2. Try marketplace JWT bearer token
    const authHeader = request.headers.get("authorization");
    const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    if (bearer) {
        try {
            await verifyMarketplaceToken(bearer);
            return null;
        } catch {
            // not a valid marketplace JWT — fall through to dev bypass / 401
        }
    }

    // 3. Dev bypass — only when the caller opted in AND the env flag is set.
    //
    // Matches the proxy.ts WWV_DEV_NO_AUTH pattern. The warning fires on
    // every bypassed request so the operator can't forget it's enabled.
    // Read-only marketplace endpoints (load, status) use this so the
    // camera + other plugin bundles can be loaded during the build
    // window without forcing a login each restart. Write endpoints
    // (install, uninstall) deliberately do NOT pass allowDevBypass.
    if (options.allowDevBypass && process.env.WWV_DEV_NO_AUTH === "true") {
        const url = new URL(request.url);
        console.warn(
            `[marketplace/auth] WWV_DEV_NO_AUTH=true — bypassing auth for ${url.pathname}. ` +
            `Unset this env to re-enable the marketplace auth gate.`,
        );
        return null;
    }

    return NextResponse.json(
        { error: "Unauthorized — sign in to Oculus0Osint or provide a valid token" },
        { status: 401 },
    );
}
