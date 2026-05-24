import type { ArgosEntity } from "./types";

export function resolveThumbnail(item: ArgosEntity): string | null {
    if (item.thumbnail_url) return item.thumbnail_url;
    const protocol = String(item.diagnostics.protocol ?? "");
    if (protocol === "snapshot" && item.live_url) return item.live_url;
    return null;
}
