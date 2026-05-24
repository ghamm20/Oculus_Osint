"use client";

import type { GeoEntity } from "@/core/plugins/PluginTypes";
import { ImageProperty } from "@/components/panels/properties/ImageProperty";
import { LongTextProperty } from "@/components/panels/properties/LongTextProperty";
import { UrlProperty } from "@/components/panels/properties/UrlProperty";
import { IntelPropertyRow } from "@/components/panels/properties/IntelPropertyRow";

function text(entity: GeoEntity, ...keys: string[]): string | undefined {
    for (const key of keys) {
        const value = entity.properties[key];
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return undefined;
}

function number(entity: GeoEntity, ...keys: string[]): number | undefined {
    for (const key of keys) {
        const value = entity.properties[key];
        if (typeof value === "number" && Number.isFinite(value)) return value;
        if (typeof value === "string" && value.trim()) {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) return parsed;
        }
    }
    return undefined;
}

function label(value: string | undefined): string {
    return value ? value.replace(/[-_]/g, " ") : "Unknown";
}

export function CitizenIncidentDetail({ entity }: { entity: GeoEntity }) {
    const severity = text(entity, "severity", "priority", "level") ?? "unknown";
    const status = text(entity, "status", "state", "lifecycle");
    const category = text(entity, "category", "incidentType", "eventType", "type");
    const address = text(entity, "address", "locationName", "place");
    const description = text(entity, "description", "summary", "details", "body");
    const sourceUrl = text(entity, "sourceUrl", "url", "webUrl", "shareUrl", "incidentUrl", "permalink");
    const videoUrl = text(entity, "videoUrl", "liveVideoUrl", "mediaUrl");
    const imageUrl = text(entity, "imageUrl", "thumbnailUrl", "photoUrl");
    const updatesCount = number(entity, "updatesCount", "updateCount", "updates");
    const notifiedCount = number(entity, "notifiedCount", "notified", "notifications");
    const reactionsCount = number(entity, "reactionsCount", "reactions");

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap" }}>
                <span style={{
                    border: "1px solid rgba(244, 63, 94, 0.35)",
                    borderRadius: "var(--radius-sm)",
                    color: "#fecdd3",
                    background: "rgba(244, 63, 94, 0.12)",
                    padding: "4px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                }}>
                    {label(severity)}
                </span>
                {status && (
                    <span style={{
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "var(--radius-sm)",
                        color: "var(--text-secondary)",
                        background: "rgba(255,255,255,0.05)",
                        padding: "4px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                    }}>
                        {label(status)}
                    </span>
                )}
            </div>

            {category && (
                <IntelPropertyRow label="Incident type">{label(category)}</IntelPropertyRow>
            )}
            {address && (
                <LongTextProperty label="Address" text={address} />
            )}
            {description && (
                <LongTextProperty label="Description" text={description} />
            )}
            {updatesCount !== undefined && (
                <IntelPropertyRow label="Updates">{updatesCount.toLocaleString()}</IntelPropertyRow>
            )}
            {notifiedCount !== undefined && (
                <IntelPropertyRow label="Notified">{notifiedCount.toLocaleString()}</IntelPropertyRow>
            )}
            {reactionsCount !== undefined && (
                <IntelPropertyRow label="Reactions">{reactionsCount.toLocaleString()}</IntelPropertyRow>
            )}
            {imageUrl && (
                <ImageProperty
                    label="Image"
                    imageUrl={imageUrl}
                    entityId={entity.id}
                    entityLabel={entity.label}
                />
            )}
            {videoUrl && (
                <UrlProperty label="Video" url={videoUrl} />
            )}
            {sourceUrl && (
                <UrlProperty label="Source" url={sourceUrl} />
            )}
        </div>
    );
}
