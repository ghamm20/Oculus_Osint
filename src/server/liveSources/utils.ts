import type { ArgosEntity, ArgosLegalStatus, ArgosSourceType, CatalogQuery, ProviderHealth } from "./types";

export function nowIso(): string {
    return new Date().toISOString();
}

export function finiteNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
}

export function cleanString(value: unknown): string | null {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    return null;
}

export function normalizeId(provider: string, id: unknown, fallback: string | number): string {
    const raw = cleanString(id) ?? String(fallback);
    return `${provider}:${raw}`.replace(/[^a-zA-Z0-9:._-]+/g, "-");
}

export function parseBbox(raw: string | null): CatalogQuery["bbox"] {
    if (!raw) return undefined;
    const parts = raw.split(",").map((v) => Number(v.trim()));
    if (parts.length !== 4 || parts.some((v) => !Number.isFinite(v))) return undefined;
    const [minLon, minLat, maxLon, maxLat] = parts;
    if (minLon >= maxLon || minLat >= maxLat) return undefined;
    return [minLon, minLat, maxLon, maxLat];
}

export function parseTypes(raw: string | null): ArgosSourceType[] | undefined {
    if (!raw) return undefined;
    const valid = new Set(["webcam", "traffic_camera", "audio", "ais", "blocked"]);
    const types = raw.split(",").map((v) => v.trim()).filter((v): v is ArgosSourceType => valid.has(v));
    return types.length ? types : undefined;
}

export function matchesQuery(item: ArgosEntity, query: CatalogQuery): boolean {
    if (query.provider && item.provider !== query.provider) return false;
    if (query.type?.length && !query.type.includes(item.type)) return false;
    if (query.bbox && item.lat !== null && item.lon !== null) {
        const [minLon, minLat, maxLon, maxLat] = query.bbox;
        if (item.lon < minLon || item.lon > maxLon || item.lat < minLat || item.lat > maxLat) return false;
    }
    if (query.q) {
        const needle = query.q.toLowerCase();
        const haystack = [
            item.title,
            item.description,
            item.city,
            item.state,
            item.country,
            item.provider,
            item.type,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(needle)) return false;
    }
    return true;
}

export function applyCatalogQuery(items: ArgosEntity[], query: CatalogQuery): ArgosEntity[] {
    const limit = Math.max(0, Math.min(query.limit ?? 5000, 10000));
    return items.filter((item) => matchesQuery(item, query)).slice(0, limit);
}

export async function withTimeout<T>(label: string, promise: Promise<T>, timeoutMs = 10_000): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_, reject) => {
                timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
            }),
        ]);
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}

export function providerHealth(params: Omit<ProviderHealth, "checked_at">): ProviderHealth {
    return {
        ...params,
        checked_at: nowIso(),
    };
}

export function unavailableLiveUrl(source_page_url: string, legal_status: ArgosLegalStatus, reason: string) {
    return {
        live_url: null,
        embed_url: null,
        source_page_url,
        requires_user_click: true,
        legal_status,
        diagnostics: { reason },
    };
}
