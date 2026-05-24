import type { ArgosEntity } from "./types";

export function resolveLiveAction(item: ArgosEntity): {
    mode: "embed" | "direct" | "source_page";
    url: string;
} {
    if (item.embed_url && item.legal_status === "approved") return { mode: "embed", url: item.embed_url };
    if (item.live_url && item.legal_status === "approved") return { mode: "direct", url: item.live_url };
    return { mode: "source_page", url: item.source_page_url };
}
