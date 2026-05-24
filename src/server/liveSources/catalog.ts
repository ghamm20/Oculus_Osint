import type { ArgosEntity, CatalogQuery } from "./types";
import { liveSourceProviders } from "./providers";
import { applyCatalogQuery, matchesQuery, withTimeout } from "./utils";
import { sampleArgosEntities } from "./samples";

interface CacheEntry {
    items: ArgosEntity[];
    expires: number;
    error?: string;
}

const catalogCache = new Map<string, CacheEntry>();

async function fetchProviderCatalog(providerId: string): Promise<{ items: ArgosEntity[]; error?: string }> {
    const provider = liveSourceProviders.find((candidate) => candidate.provider_id === providerId);
    if (!provider) return { items: [], error: "Unknown provider" };
    const now = Date.now();
    const cached = catalogCache.get(provider.provider_id);
    if (cached && cached.expires > now && !cached.error) return { items: cached.items };

    try {
        const items = await withTimeout(provider.display_name, provider.fetch_catalog({ includeSamples: false }), 15_000);
        catalogCache.set(provider.provider_id, {
            items,
            expires: now + (provider.cache_ttl_seconds ?? 900) * 1000,
        });
        return { items };
    } catch (err: any) {
        const error = err?.message ?? String(err);
        catalogCache.set(provider.provider_id, {
            items: cached?.items ?? [],
            expires: now + 60_000,
            error,
        });
        return { items: cached?.items ?? [], error };
    }
}

export function clearCatalogCache(): void {
    catalogCache.clear();
}

export async function fetchLiveSourceCatalog(query: CatalogQuery = {}): Promise<{
    items: ArgosEntity[];
    diagnostics: {
        provider_errors: Record<string, string>;
        sample_fallback: boolean;
        total_before_filter: number;
    };
}> {
    const providerErrors: Record<string, string> = {};
    const providerIds = query.provider
        ? [query.provider]
        : liveSourceProviders.map((provider) => provider.provider_id);

    const results = await Promise.all(providerIds.map(fetchProviderCatalog));
    let items = results.flatMap((result, index) => {
        if (result.error) providerErrors[providerIds[index]] = result.error;
        return result.items;
    });

    const hasLiveItems = items.some((item) => item.provider !== "argos-demo" && item.provider !== "blocked-insecam");
    let sampleFallback = false;
    if (query.includeSamples !== false && !query.provider && !hasLiveItems) {
        items = sampleArgosEntities();
        sampleFallback = true;
    }

    if (query.includeSamples !== false && !query.provider) {
        const demoItems = sampleArgosEntities().filter((item) => !items.some((existing) => existing.id === item.id));
        items = [...items, ...demoItems];
    }

    const totalBeforeFilter = items.length;
    const filtered = applyCatalogQuery(
        items.filter((item) => matchesQuery(item, query)),
        query,
    );

    return {
        items: filtered,
        diagnostics: {
            provider_errors: providerErrors,
            sample_fallback: sampleFallback,
            total_before_filter: totalBeforeFilter,
        },
    };
}

export async function findLiveSourceItem(id: string): Promise<ArgosEntity | null> {
    const { items } = await fetchLiveSourceCatalog({ includeSamples: true, limit: 10000 });
    return items.find((item) => item.id === id) ?? null;
}
