"use client";

import type { GeoEntity } from "@/core/plugins/PluginTypes";
import { ExternalLink, Play, ShieldAlert } from "lucide-react";

function getString(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null;
}

function getNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function openUrl(url: string | null) {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
}

export function ArgosEntityDetail({ entity }: { entity: GeoEntity }) {
    const liveUrl = getString(entity.properties.live_url);
    const embedUrl = getString(entity.properties.embed_url);
    const sourcePageUrl = getString(entity.properties.source_page_url);
    const legalStatus = getString(entity.properties.legal_status) ?? "unknown";
    const status = getString(entity.properties.status) ?? "active";
    const sourceType = getString(entity.properties.source_type) ?? getString(entity.properties.type) ?? "unknown";
    const freshness = getNumber(entity.properties.freshness_score);
    const trust = getNumber(entity.properties.trust_score);
    const diagnostics = entity.properties.diagnostics as Record<string, unknown> | undefined;
    const playable = legalStatus !== "blocked" && (!!liveUrl || !!embedUrl);

    return (
        <div className="argos-detail">
            <div className={`argos-detail__status argos-detail__status--${legalStatus}`}>
                <ShieldAlert size={14} />
                <span>{legalStatus.replace("_", " ")}</span>
            </div>
            <div className="argos-detail__diagnostics">
                <div>Type: {sourceType}</div>
                <div>Status: {status}</div>
                {freshness !== null && <div>Freshness: {(freshness * 100).toFixed(0)}%</div>}
                {trust !== null && <div>Trust: {(trust * 100).toFixed(0)}%</div>}
            </div>
            <div className="argos-detail__actions">
                <button
                    type="button"
                    className="argos-detail__button"
                    onClick={() => openUrl(playable ? (embedUrl ?? liveUrl) : sourcePageUrl)}
                    disabled={!playable && !sourcePageUrl}
                >
                    <Play size={14} />
                    <span>{playable ? "Open Live View" : "Open Source Page"}</span>
                </button>
                <button
                    type="button"
                    className="argos-detail__button"
                    onClick={() => openUrl(sourcePageUrl)}
                    disabled={!sourcePageUrl}
                >
                    <ExternalLink size={14} />
                    <span>Open Source Page</span>
                </button>
            </div>
            {diagnostics && (
                <pre className="argos-detail__diagnostics">
                    {JSON.stringify(diagnostics, null, 2)}
                </pre>
            )}
        </div>
    );
}
