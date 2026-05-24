import { NextResponse, type NextRequest } from "next/server";
import { fetchManyAdapters, getAdapterMetadata, resolveSources } from "../adapters/registry";

/**
 * Returns metadata for every registered camera adapter so the client plugin
 * can render a dynamic settings UI (source toggles, key-required hints,
 * health indicators) without hardcoding the adapter list. Adding a source
 * to `adapters/registry.ts` makes it appear here automatically.
 */
export async function GET(req: NextRequest) {
    const refresh = req.nextUrl.searchParams.get("refresh") === "1";
    if (refresh) {
        const sources = resolveSources(req.nextUrl.searchParams.get("sources"));
        await fetchManyAdapters(sources);
    }

    return NextResponse.json({ adapters: getAdapterMetadata() });
}
