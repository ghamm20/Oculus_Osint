import type { ArgosEntity } from "./types";

export function hasUsablePosition(item: ArgosEntity): boolean {
    return typeof item.lat === "number"
        && Number.isFinite(item.lat)
        && typeof item.lon === "number"
        && Number.isFinite(item.lon);
}

export function itemRegion(item: ArgosEntity): string {
    return [item.city, item.state, item.country].filter(Boolean).join(", ") || "Unknown location";
}
