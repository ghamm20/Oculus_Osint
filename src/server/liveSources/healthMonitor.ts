import type { LiveSourceProvider, ProviderHealth } from "./types";

export async function checkProviders(providers: LiveSourceProvider[]): Promise<ProviderHealth[]> {
    const results = await Promise.allSettled(providers.map((provider) => provider.healthcheck()));
    return results.map((result, index) => {
        if (result.status === "fulfilled") return result.value;
        const provider = providers[index];
        return {
            provider_id: provider.provider_id,
            display_name: provider.display_name,
            source_type: provider.source_type,
            status: "unavailable",
            requires_api_key: provider.requires_api_key,
            terms_url: provider.terms_url,
            checked_at: new Date().toISOString(),
            item_count: null,
            message: result.reason?.message ?? String(result.reason),
            diagnostics: { error: result.reason?.message ?? String(result.reason) },
        };
    });
}
