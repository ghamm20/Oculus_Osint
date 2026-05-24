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

function bool(entity: GeoEntity, key: string): boolean {
    return entity.properties[key] === true;
}

function titleCase(value: string | undefined): string {
    return value ? value.replace(/[-_]/g, " ") : "Unknown";
}

export function FlockObservationDetail({ entity }: { entity: GeoEntity }) {
    const plate = text(entity, "plate", "plateMasked");
    const plateState = text(entity, "plateState");
    const make = text(entity, "vehicleMake");
    const model = text(entity, "vehicleModel");
    const color = text(entity, "vehicleColor");
    const vehicleType = text(entity, "vehicleType");
    const confidence = number(entity, "confidence");
    const cameraName = text(entity, "cameraName");
    const cameraId = text(entity, "cameraId");
    const agency = text(entity, "agency");
    const address = text(entity, "address");
    const direction = text(entity, "direction");
    const lane = text(entity, "lane");
    const alertType = text(entity, "alertType");
    const alertReason = text(entity, "alertReason");
    const imageUrl = text(entity, "imageUrl");
    const sourceUrl = text(entity, "sourceUrl");
    const hotlistHit = bool(entity, "hotlistHit");
    const fullPlateVisible = bool(entity, "fullPlateVisible");

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-sm)" }}>
            <div style={{ display: "flex", gap: "var(--space-xs)", flexWrap: "wrap" }}>
                <span style={{
                    border: hotlistHit ? "1px solid rgba(239, 68, 68, 0.45)" : "1px solid rgba(14, 165, 233, 0.35)",
                    borderRadius: "var(--radius-sm)",
                    color: hotlistHit ? "#fecaca" : "#bae6fd",
                    background: hotlistHit ? "rgba(239, 68, 68, 0.14)" : "rgba(14, 165, 233, 0.12)",
                    padding: "4px 8px",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                }}>
                    {hotlistHit ? "ALPR alert" : "ALPR observation"}
                </span>
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
                    {fullPlateVisible ? "Full plate shown" : "Plate masked"}
                </span>
            </div>

            {plate && <IntelPropertyRow label="Plate">{plate}</IntelPropertyRow>}
            {plateState && <IntelPropertyRow label="Plate state">{plateState}</IntelPropertyRow>}
            {(make || model || color || vehicleType) && (
                <IntelPropertyRow label="Vehicle">
                    {[color, make, model, vehicleType].filter(Boolean).join(" ")}
                </IntelPropertyRow>
            )}
            {confidence !== undefined && (
                <IntelPropertyRow label="Confidence">{confidence.toLocaleString()}</IntelPropertyRow>
            )}
            {cameraName && <IntelPropertyRow label="Camera">{cameraName}</IntelPropertyRow>}
            {cameraId && <IntelPropertyRow label="Camera ID">{cameraId}</IntelPropertyRow>}
            {agency && <IntelPropertyRow label="Agency">{agency}</IntelPropertyRow>}
            {address && <LongTextProperty label="Location" text={address} />}
            {direction && <IntelPropertyRow label="Direction">{titleCase(direction)}</IntelPropertyRow>}
            {lane && <IntelPropertyRow label="Lane">{lane}</IntelPropertyRow>}
            {alertType && <IntelPropertyRow label="Alert type">{titleCase(alertType)}</IntelPropertyRow>}
            {alertReason && <LongTextProperty label="Alert reason" text={alertReason} />}
            {imageUrl && (
                <ImageProperty
                    label="Vehicle image"
                    imageUrl={imageUrl}
                    entityId={entity.id}
                    entityLabel={entity.label}
                />
            )}
            {sourceUrl && <UrlProperty label="Source" url={sourceUrl} />}
        </div>
    );
}
