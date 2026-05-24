import { fetchLiveSourceCatalog, findLiveSourceItem } from "@/server/liveSources/catalog";
import { normalizeLiveSourceItem } from "./providerRegistry";
import { getSensorScheduler } from "./nrtScheduler";
import type { EvidenceEntity } from "./streamSchema";

export type FeedMethod =
    | "iframe_embed"
    | "hls_video"
    | "mjpeg_video"
    | "rtsp_proxy_required"
    | "snapshot_only"
    | "audio_stream"
    | "source_page_only"
    | "unavailable"
    | "blocked";

export type FeedStatus = "playable" | "source-page-only" | "unavailable" | "blocked" | "api-required";

export interface FeedDiagnostics {
    has_live_url: boolean;
    has_embed_url: boolean;
    has_thumbnail: boolean;
    can_iframe: boolean;
    can_play_hls: boolean;
    can_play_mjpeg: boolean;
    audio_playable: boolean;
    source_page_available: boolean;
    last_tested: string;
    test_result: string;
    failure_reason: string | null;
}

export interface FeedResolution {
    entity_id: string;
    provider: string;
    source_type: EvidenceEntity["source_type"];
    title: string;
    method: FeedMethod;
    status: FeedStatus;
    playable: boolean;
    viewable: boolean;
    live_url: string | null;
    embed_url: string | null;
    thumbnail_url: string | null;
    snapshot_url: string | null;
    source_page_url: string | null;
    player_url: string | null;
    copy_url: string | null;
    requires_user_click: boolean;
    legal_status: EvidenceEntity["legal_status"];
    failure_reason: string | null;
    actions: {
        can_play_live: boolean;
        can_listen_live: boolean;
        can_open_source: boolean;
        can_copy_source: boolean;
        can_show_thumbnail: boolean;
    };
    diagnostics: FeedDiagnostics;
    entity: EvidenceEntity;
}

const IMAGE_RE = /\.(jpg|jpeg|png|webp|gif|svg)(\?|#|$)/i;

function lower(url: string | null | undefined): string {
    return (url ?? "").trim().toLowerCase();
}

function isHls(url: string | null | undefined): boolean {
    return lower(url).includes(".m3u8");
}

function isMjpeg(url: string | null | undefined): boolean {
    const value = lower(url);
    return value.includes("mjpeg") || value.includes(".mjpg") || value.includes("axis-cgi/mjpg");
}

function isImageSnapshot(url: string | null | undefined): boolean {
    const value = lower(url);
    return IMAGE_RE.test(value) || value.includes("snapshot") || value.includes("/image?");
}

function isRtsp(url: string | null | undefined): boolean {
    return lower(url).startsWith("rtsp://");
}

function isAudioUrl(url: string | null | undefined): boolean {
    const value = lower(url);
    return /\.(mp3|aac|m4a|ogg|oga|wav)(\?|#|$)/i.test(value) || value.includes("/audio") || value.includes("stream");
}

function encodedId(entity: EvidenceEntity): string {
    return encodeURIComponent(entity.id);
}

function demoSnapshotUrl(entity: EvidenceEntity): string {
    return `/api/feeds/${encodedId(entity)}/snapshot`;
}

function resolveSnapshotUrl(entity: EvidenceEntity): string | null {
    const protocol = typeof entity.diagnostics?.protocol === "string" ? entity.diagnostics.protocol : null;
    const demoSnapshotCapable = protocol === "snapshot" || protocol === "iframe" || protocol === "mjpeg";
    if (entity.diagnostics?.sample && demoSnapshotCapable && (entity.source_type === "webcam" || entity.source_type === "traffic_camera")) {
        return demoSnapshotUrl(entity);
    }
    if (entity.thumbnail_url) return entity.thumbnail_url;
    if (isImageSnapshot(entity.live_url)) return entity.live_url;
    return null;
}

function classify(entity: EvidenceEntity): { method: FeedMethod; status: FeedStatus; failure_reason: string | null } {
    if (entity.legal_status === "blocked" || entity.source_type === "blocked") {
        return { method: "blocked", status: "blocked", failure_reason: "Provider is blocked for authorization or privacy reasons." };
    }

    if (entity.embed_url) return { method: "iframe_embed", status: "playable", failure_reason: null };

    if (entity.live_url) {
        if (isRtsp(entity.live_url)) {
            return { method: "rtsp_proxy_required", status: "unavailable", failure_reason: "RTSP requires a configured local proxy before ARGOS can play it in-browser." };
        }
        if (entity.source_type === "audio" && (isAudioUrl(entity.live_url) || isHls(entity.live_url))) {
            return { method: "audio_stream", status: "playable", failure_reason: null };
        }
        if (isHls(entity.live_url)) return { method: "hls_video", status: "playable", failure_reason: null };
        if (isMjpeg(entity.live_url)) return { method: "mjpeg_video", status: "playable", failure_reason: null };
        if (isImageSnapshot(entity.live_url)) return { method: "snapshot_only", status: "playable", failure_reason: null };
    }

    if (resolveSnapshotUrl(entity)) return { method: "snapshot_only", status: "playable", failure_reason: null };

    if (entity.legal_status === "api_required") {
        return { method: "source_page_only", status: "api-required", failure_reason: "Provider requires API approval, credentials, or click-through terms before a playable feed can be loaded." };
    }

    if (entity.source_page_url) {
        return { method: "source_page_only", status: "source-page-only", failure_reason: "No direct playable URL is available; use the provider source page." };
    }

    return { method: "unavailable", status: "unavailable", failure_reason: "No live URL, embed URL, thumbnail, or source page is available for this entity." };
}

export function resolveFeed(entity: EvidenceEntity, now = new Date()): FeedResolution {
    const liveUrl = entity.live_url;
    const embedUrl = entity.embed_url;
    const thumbnailUrl = entity.thumbnail_url;
    const snapshotUrl = resolveSnapshotUrl(entity);
    const { method, status, failure_reason } = classify(entity);
    const playable = status === "playable";
    const viewable = playable || status === "source-page-only" || status === "api-required";
    const playerUrl = method === "iframe_embed"
        ? `/api/feeds/${encodedId(entity)}/embed`
        : method === "snapshot_only"
            ? snapshotUrl
            : method === "hls_video" || method === "mjpeg_video" || method === "audio_stream"
                ? liveUrl
                : null;
    const copyUrl = liveUrl ?? embedUrl ?? snapshotUrl ?? entity.source_page_url;

    const diagnostics: FeedDiagnostics = {
        has_live_url: !!liveUrl,
        has_embed_url: !!embedUrl,
        has_thumbnail: !!thumbnailUrl || !!snapshotUrl,
        can_iframe: method === "iframe_embed",
        can_play_hls: method === "hls_video",
        can_play_mjpeg: method === "mjpeg_video",
        audio_playable: method === "audio_stream",
        source_page_available: !!entity.source_page_url,
        last_tested: now.toISOString(),
        test_result: status,
        failure_reason,
    };

    return {
        entity_id: entity.id,
        provider: entity.provider,
        source_type: entity.source_type,
        title: entity.title,
        method,
        status,
        playable,
        viewable,
        live_url: liveUrl,
        embed_url: embedUrl,
        thumbnail_url: thumbnailUrl,
        snapshot_url: snapshotUrl,
        source_page_url: entity.source_page_url,
        player_url: playerUrl,
        copy_url: copyUrl,
        requires_user_click: entity.requires_user_click,
        legal_status: entity.legal_status,
        failure_reason,
        actions: {
            can_play_live: playable && entity.source_type !== "audio",
            can_listen_live: method === "audio_stream" || (entity.source_type === "audio" && !!entity.source_page_url),
            can_open_source: !!entity.source_page_url,
            can_copy_source: !!copyUrl,
            can_show_thumbnail: !!snapshotUrl || !!thumbnailUrl,
        },
        diagnostics,
        entity,
    };
}

export async function resolveEntityFeed(entityId: string): Promise<FeedResolution | null> {
    const scheduler = getSensorScheduler();
    scheduler.start();
    let entity = scheduler.getEntity(entityId);
    if (!entity && scheduler.getEntities().length === 0) {
        await scheduler.refreshAll(true);
        entity = scheduler.getEntity(entityId);
    }
    if (!entity) {
        const liveItem = await findLiveSourceItem(entityId);
        if (liveItem) entity = normalizeLiveSourceItem(liveItem, liveItem.refresh_seconds);
    }
    return entity ? resolveFeed(entity) : null;
}

export async function resolveAllFeeds(): Promise<FeedResolution[]> {
    const scheduler = getSensorScheduler();
    scheduler.start();
    if (scheduler.getEntities().length === 0) await scheduler.refreshAll(true);
    const entities = scheduler.getEntities();
    const feeds = entities.map((entity) => resolveFeed(entity));
    const seen = new Set(entities.map((entity) => entity.id));
    const { items: blockedItems } = await fetchLiveSourceCatalog({ provider: "blocked-insecam", includeSamples: true, limit: 1000 });
    for (const item of blockedItems) {
        if (seen.has(item.id)) continue;
        feeds.push(resolveFeed(normalizeLiveSourceItem(item, item.refresh_seconds)));
    }
    return feeds;
}

export function providerPlayableSummary(feeds: FeedResolution[]) {
    const out: Record<string, { playable: number; source_page_only: number; api_required: number; blocked: number; unavailable: number; total: number }> = {};
    for (const feed of feeds) {
        const row = out[feed.provider] ?? { playable: 0, source_page_only: 0, api_required: 0, blocked: 0, unavailable: 0, total: 0 };
        row.total += 1;
        if (feed.status === "playable") row.playable += 1;
        else if (feed.status === "source-page-only") row.source_page_only += 1;
        else if (feed.status === "api-required") row.api_required += 1;
        else if (feed.status === "blocked") row.blocked += 1;
        else row.unavailable += 1;
        out[feed.provider] = row;
    }
    return out;
}

export function resolverClassSummary(feeds: FeedResolution[]) {
    const out: Record<FeedMethod, { playable: number; viewable: number; total: number }> = {
        iframe_embed: { playable: 0, viewable: 0, total: 0 },
        hls_video: { playable: 0, viewable: 0, total: 0 },
        mjpeg_video: { playable: 0, viewable: 0, total: 0 },
        rtsp_proxy_required: { playable: 0, viewable: 0, total: 0 },
        snapshot_only: { playable: 0, viewable: 0, total: 0 },
        audio_stream: { playable: 0, viewable: 0, total: 0 },
        source_page_only: { playable: 0, viewable: 0, total: 0 },
        unavailable: { playable: 0, viewable: 0, total: 0 },
        blocked: { playable: 0, viewable: 0, total: 0 },
    };
    for (const feed of feeds) {
        out[feed.method].total += 1;
        if (feed.playable) out[feed.method].playable += 1;
        if (feed.viewable) out[feed.method].viewable += 1;
    }
    return out;
}

export function demoSnapshotSvg(entity: EvidenceEntity): string {
    const city = typeof entity.raw.city === "string" ? entity.raw.city : "ARGOS";
    const state = typeof entity.raw.state === "string" ? entity.raw.state : "Demo";
    const hue = Math.abs(entity.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)) % 360;
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "UTC", hour12: false });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
  <defs>
    <linearGradient id="sky" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="hsl(${hue}, 68%, 18%)"/>
      <stop offset="1" stop-color="hsl(${(hue + 70) % 360}, 72%, 34%)"/>
    </linearGradient>
  </defs>
  <rect width="960" height="540" fill="url(#sky)"/>
  <path d="M0 370 C150 320 250 390 390 345 C540 296 670 365 960 300 L960 540 L0 540 Z" fill="rgba(2,6,23,0.62)"/>
  <g fill="rgba(248,250,252,0.84)">
    <text x="44" y="74" font-family="Arial, sans-serif" font-size="30" font-weight="700">ARGOS DEMO FEED</text>
    <text x="44" y="118" font-family="Arial, sans-serif" font-size="22">${escapeXml(entity.title)}</text>
    <text x="44" y="152" font-family="Arial, sans-serif" font-size="16">${escapeXml(city)}, ${escapeXml(state)} / snapshot refresh / not a real camera</text>
    <text x="44" y="502" font-family="Arial, sans-serif" font-size="16">UTC ${escapeXml(timestamp)} / ${escapeXml(entity.id)}</text>
  </g>
  <g stroke="rgba(248,250,252,0.32)" stroke-width="2">
    <path d="M44 185 H916"/>
    <path d="M44 438 H916"/>
    <path d="M120 210 V420"/>
    <path d="M300 210 V420"/>
    <path d="M480 210 V420"/>
    <path d="M660 210 V420"/>
    <path d="M840 210 V420"/>
  </g>
</svg>`;
}

function escapeXml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
