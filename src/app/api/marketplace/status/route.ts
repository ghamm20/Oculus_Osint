import { NextResponse } from "next/server";
import { validateMarketplaceAuth } from "@/lib/marketplace/auth";
import { getInstalledPlugins } from "@/lib/marketplace/repository";
import { handlePreflight, withCors } from "@/lib/marketplace/cors";
import { marketplaceApiLimiter } from "@/lib/rateLimiters";
import { getClientIp } from "@/lib/rateLimit";
import { isDemo, isDemoAdmin } from "@/core/edition";
import { auth } from "@/lib/auth";

export async function OPTIONS(request: Request) {
    return handlePreflight(request);
}

export async function GET(request: Request) {
    const rateLimited = marketplaceApiLimiter.check(getClientIp(request));
    if (rateLimited) return withCors(rateLimited, request);

    // In demo mode, the plugin list is public (read-only for non-admins).
    // For local/cloud, we continue to enforce authentication on this list,
    // but read-only endpoints opt into the WWV_DEV_NO_AUTH dev bypass so the
    // status poll keeps working during the build window without a session.

    if (!isDemo) {
        const authError = await validateMarketplaceAuth(request, { allowDevBypass: true });
        if (authError) return withCors(authError, request);
    }

    try {
        const dbPlugins = await getInstalledPlugins();
        const dbMap = new Map(dbPlugins.map((p: any) => [p.pluginId, p]));

        // Collect active DB plugins (exclude disabled ones)
        const activeDbPlugins = dbPlugins.filter((p: any) => p.enabled !== false);

        const plugins = activeDbPlugins;

        let canManagePlugins = !isDemo;
        if (isDemo) {
            // Demo's "can manage" probe checks for an actual session, so do NOT
            // allow the dev bypass here — it would falsely advertise manage
            // permissions to anonymous demo visitors.
            const authError = await validateMarketplaceAuth(request);
            canManagePlugins = authError === null;
        }

        return withCors(NextResponse.json({ plugins, canManagePlugins }), request);
    } catch (err) {
        console.error("[marketplace/status] Error:", err);
        let canManagePlugins = !isDemo;
        if (isDemo) {
            const authError = await validateMarketplaceAuth(request);
            canManagePlugins = authError === null;
        }

        return withCors(NextResponse.json({ plugins: [], canManagePlugins }), request);
    }
}

