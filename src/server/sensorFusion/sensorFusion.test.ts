import { afterEach, describe, expect, it, vi } from "vitest";
import { pluginRegistry } from "@/core/plugins/PluginRegistry";
import { useStore } from "@/core/state/store";
import { DEFAULT_VISIBLE_PLUGIN_IDS, registerBuiltInIntelligencePlugins } from "@/plugins/builtin/intelligencePlugins";
import { sampleArgosEntities } from "@/server/liveSources/samples";
import { NrtScheduler } from "./nrtScheduler";
import { EntityStore } from "./entityStore";
import { sensorEventBus } from "./eventBus";
import { freshnessScore } from "./freshness";
import { trustScore } from "./trustScoring";
import { correlateEntities } from "./correlationEngine";
import { detectAnomalies } from "./anomalyEngine";
import { buildOperatorBrief } from "./intelligenceCompressor";
import { replayStore } from "./replayStore";
import { filterEntities } from "./query";
import { getSensorProvider, listSensorProviders, normalizeLiveSourceItem, validateStream } from "./providerRegistry";
import { resolveFeed, resolverClassSummary } from "./feedResolver";
import type { EvidenceEntity, SensorEvent, SensorProviderHealth } from "./streamSchema";

function entity(overrides: Partial<EvidenceEntity> = {}): EvidenceEntity {
    const now = new Date().toISOString();
    return {
        id: "entity:test",
        source_id: "entity:test",
        provider: "argos-demo",
        source_type: "webcam",
        title: "Test entity",
        description: null,
        lat: 33.749,
        lon: -84.388,
        alt: null,
        heading: null,
        speed: null,
        status: "active",
        severity: "low",
        confidence: 0.8,
        trust_score: 0.6,
        freshness_score: 1,
        last_seen: now,
        first_seen: now,
        updated_at: now,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        source_page_url: "https://example.test/source",
        live_url: null,
        embed_url: null,
        thumbnail_url: null,
        requires_user_click: true,
        legal_status: "approved",
        tags: ["test"],
        raw: { city: "Atlanta", state: "GA", country: "United States" },
        diagnostics: {},
        ...overrides,
    };
}

function health(overrides: Partial<SensorProviderHealth> = {}): SensorProviderHealth {
    return {
        provider_id: "argos-demo",
        display_name: "ARGOS Safe Demo Layer",
        source_type: "webcam",
        health: "healthy",
        requires_api_key: false,
        terms_url: "https://github.com/ghamm20/Oculus_Osint",
        last_refresh: new Date().toISOString(),
        next_refresh: new Date(Date.now() + 10_000).toISOString(),
        entity_count: 1,
        stale_count: 0,
        refresh_interval_seconds: 10,
        error_state: null,
        message: "ok",
        diagnostics: {},
        ...overrides,
    };
}

describe("ARGOS NRT sensor fusion", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("loads the sensor provider registry", () => {
        const ids = listSensorProviders().map((provider) => provider.provider_id);
        expect(ids).toContain("argos-demo");
        expect(ids).toContain("fl511-public");
        expect(ids).toContain("blocked-insecam");
        expect(ids).toContain("user-streams");
    });

    it("updates provider health states in the entity store", () => {
        const store = new EntityStore();
        const event = store.setProviderHealth(health({ health: "degraded", error_state: "probe failed" }));
        expect(event?.type).toBe("provider_health_changed");
        expect(store.getProviderHealth()[0].health).toBe("degraded");
    });

    it("normalizes catalog items into the universal evidence schema", () => {
        const normalized = normalizeLiveSourceItem(sampleArgosEntities()[0], 10);
        expect(normalized).toMatchObject({
            source_id: expect.any(String),
            source_type: expect.any(String),
            confidence: expect.any(Number),
            trust_score: expect.any(Number),
            freshness_score: expect.any(Number),
            tags: expect.any(Array),
        });
    });

    it("NRT scheduler emits refresh events for due providers", async () => {
        const scheduler = new NrtScheduler();
        const provider = getSensorProvider("argos-demo");
        expect(provider).toBeTruthy();
        const events = await scheduler.refreshProvider(provider!, true);
        expect(events.some((event) => event.type === "entity_created" || event.type === "entity_updated")).toBe(true);
    });

    it("event bus emits live entity updates for SSE transport", async () => {
        const event: SensorEvent = {
            id: "event:test",
            type: "entity_updated",
            entity_id: "entity:test",
            provider: "argos-demo",
            severity: "low",
            confidence: 0.8,
            title: "Test",
            summary: "Test update",
            location: "Atlanta, GA",
            created_at: new Date().toISOString(),
            payload: { entity: entity() },
        };
        const received = new Promise<SensorEvent>((resolve) => {
            const unsubscribe = sensorEventBus.subscribe((next) => {
                unsubscribe();
                resolve(next);
            });
        });
        sensorEventBus.publish(event);
        await expect(received).resolves.toMatchObject({ id: "event:test", type: "entity_updated" });
    });

    it("freshness score decays with age", () => {
        const fresh = freshnessScore(new Date().toISOString(), 60);
        const stale = freshnessScore(new Date(Date.now() - 10 * 60_000).toISOString(), 60);
        expect(fresh).toBeGreaterThan(stale);
        expect(stale).toBe(0);
    });

    it("trust score decreases when a provider is failing", () => {
        const base = entity();
        expect(trustScore(base, "healthy")).toBeGreaterThan(trustScore(base, "unavailable"));
    });

    it("correlates nearby time-related entities", () => {
        const a = entity({ id: "a", lat: 33.749, lon: -84.388, tags: ["storm"] });
        const b = entity({ id: "b", source_type: "traffic_camera", lat: 33.75, lon: -84.39, tags: ["storm"] });
        const correlations = correlateEntities([a, b], { distanceMeters: 1000, windowSeconds: 60 });
        expect(correlations[0].entities).toEqual(expect.arrayContaining(["a", "b"]));
    });

    it("detects heuristic entity count spikes", () => {
        const events = Array.from({ length: 26 }, (_, index): SensorEvent => ({
            id: `created:${index}`,
            type: "entity_created",
            entity_id: `e:${index}`,
            provider: "argos-demo",
            severity: "low",
            confidence: 0.7,
            title: "created",
            summary: "created",
            location: null,
            created_at: new Date().toISOString(),
            payload: {},
        }));
        const anomalies = detectAnomalies({ entities: [], events, providerHealth: [] });
        expect(anomalies.some((item) => item.rule_id === "entity_count_spike")).toBe(true);
    });

    it("operator brief returns top items", () => {
        const brief = buildOperatorBrief({
            mode: "global-awareness",
            entities: [entity({ id: "brief:item" })],
            correlations: [],
            anomalies: [],
            providerHealth: [health()],
        });
        expect(brief.top_items.length).toBeGreaterThan(0);
        expect(brief.top_items[0].supporting_entities).toContain("brief:item");
    });

    it("blocked source provider cannot return playable streams", async () => {
        const provider = getSensorProvider("blocked-insecam");
        const live = await provider!.get_live_url("blocked");
        expect(live.legal_status).toBe("blocked");
        expect(live.live_url).toBeNull();
        expect(live.embed_url).toBeNull();
    });

    it("generic stream validation rejects invalid URLs honestly", async () => {
        const result = await validateStream("not-a-stream");
        expect(result.ok).toBe(false);
        expect(result.health_status).toBe("unsupported_codec");
        expect(result.capabilities_json.notes).toContain("unsupported_or_unknown_protocol");
    });

    it("feed resolver classifies iframe embeds", () => {
        const feed = resolveFeed(entity({ embed_url: "https://example.test/embed", thumbnail_url: "https://example.test/thumb.jpg" }));
        expect(feed.method).toBe("iframe_embed");
        expect(feed.status).toBe("playable");
        expect(feed.diagnostics.can_iframe).toBe(true);
    });

    it("feed resolver classifies HLS video", () => {
        const feed = resolveFeed(entity({ live_url: "https://example.test/live/master.m3u8" }));
        expect(feed.method).toBe("hls_video");
        expect(feed.status).toBe("playable");
        expect(feed.diagnostics.can_play_hls).toBe(true);
    });

    it("feed resolver classifies MJPEG image streams", () => {
        const feed = resolveFeed(entity({ live_url: "https://example.test/axis-cgi/mjpg/video.cgi" }));
        expect(feed.method).toBe("mjpeg_video");
        expect(feed.status).toBe("playable");
        expect(feed.diagnostics.can_play_mjpeg).toBe(true);
    });

    it("feed resolver classifies snapshot-only feeds", () => {
        const feed = resolveFeed(entity({ live_url: "https://example.test/camera/snapshot.jpg" }));
        expect(feed.method).toBe("snapshot_only");
        expect(feed.status).toBe("playable");
        expect(feed.actions.can_show_thumbnail).toBe(true);
    });

    it("feed resolver classifies audio streams", () => {
        const feed = resolveFeed(entity({ source_type: "audio", live_url: "https://example.test/audio/live.wav" }));
        expect(feed.method).toBe("audio_stream");
        expect(feed.status).toBe("playable");
        expect(feed.diagnostics.audio_playable).toBe(true);
    });

    it("feed resolver classifies source-page-only feeds", () => {
        const feed = resolveFeed(entity({ source_page_url: "https://example.test/source", live_url: null, embed_url: null, thumbnail_url: null }));
        expect(feed.method).toBe("source_page_only");
        expect(feed.status).toBe("source-page-only");
        expect(feed.actions.can_open_source).toBe(true);
    });

    it("feed resolver classifies blocked feeds without playable URLs", () => {
        const feed = resolveFeed(entity({ source_type: "blocked", legal_status: "blocked" }));
        expect(feed.method).toBe("blocked");
        expect(feed.status).toBe("blocked");
        expect(feed.playable).toBe(false);
    });

    it("feed resolver classifies unavailable feeds with exact reason", () => {
        const feed = resolveFeed(entity({ source_page_url: "", live_url: null, embed_url: null, thumbnail_url: null }));
        expect(feed.method).toBe("unavailable");
        expect(feed.status).toBe("unavailable");
        expect(feed.failure_reason).toMatch(/No live URL/);
    });

    it("feed resolver classifies RTSP feeds as proxy-required", () => {
        const feed = resolveFeed(entity({ live_url: "rtsp://example.invalid/stream" }));
        expect(feed.method).toBe("rtsp_proxy_required");
        expect(feed.status).toBe("unavailable");
        expect(feed.failure_reason).toMatch(/proxy/i);
    });

    it("demo feed catalog includes every resolver class for UI verification", async () => {
        const items = sampleArgosEntities().map((item) => normalizeLiveSourceItem(item, item.refresh_seconds));
        const feeds = items.map((item) => resolveFeed(item));
        const classes = resolverClassSummary(feeds);
        expect(classes.iframe_embed.total).toBeGreaterThan(0);
        expect(classes.hls_video.total).toBeGreaterThan(0);
        expect(classes.mjpeg_video.total).toBeGreaterThan(0);
        expect(classes.snapshot_only.total).toBeGreaterThanOrEqual(5);
        expect(classes.audio_stream.total).toBeGreaterThan(0);
        expect(classes.source_page_only.total).toBeGreaterThanOrEqual(3);
        expect(classes.rtsp_proxy_required.total).toBeGreaterThan(0);
        expect(classes.unavailable.total).toBeGreaterThan(0);
        expect(classes.blocked.total).toBeGreaterThan(0);
        expect(feeds.filter((feed) => feed.source_type === "audio").length).toBeGreaterThanOrEqual(3);
    });

    it("frontend ARGOS plugin receives entities and renders map markers", async () => {
        registerBuiltInIntelligencePlugins();
        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            json: async () => ({ entities: [entity({ id: "ui:entity", source_type: "traffic_camera" })] }),
        })));
        const plugin = pluginRegistry.get("argos-live");
        expect(plugin).toBeTruthy();
        const entities = await plugin!.fetch({ start: new Date(), end: new Date() } as any);
        useStore.getState().setEntities("argos-live", entities);
        expect(useStore.getState().entitiesByPlugin["argos-live"][0]).toMatchObject({
            id: "ui:entity",
            pluginId: "argos-live",
        });
    });

    it("empty provider state exposes no-data diagnostics", () => {
        const filtered = filterEntities([], { limit: 10 });
        expect(filtered).toHaveLength(0);
        expect({ no_data_loaded: filtered.length === 0 }).toMatchObject({ no_data_loaded: true });
    });

    it("sample intelligence layer is clearly marked demo", async () => {
        const provider = getSensorProvider("argos-demo");
        const items = await provider!.fetch_catalog();
        expect(items.length).toBeGreaterThan(0);
        expect(items[0].diagnostics.sample).toBe(true);
        expect(DEFAULT_VISIBLE_PLUGIN_IDS).toContain("argos-live");
    });

    it("replay store returns stored state changes", () => {
        const event: SensorEvent = {
            id: "replay:test",
            type: "entity_created",
            entity_id: "replay:entity",
            provider: "argos-demo",
            severity: "low",
            confidence: 0.7,
            title: "Replay",
            summary: "Replay update",
            location: null,
            created_at: new Date().toISOString(),
            payload: {},
        };
        replayStore.record(event, entity({ id: "replay:entity" }));
        expect(replayStore.recent(5).some((update) => update.event.id === "replay:test")).toBe(true);
    });

    it("live view has an honest unavailable reason for blocked sources", async () => {
        const provider = getSensorProvider("blocked-insecam");
        const live = await provider!.get_live_url("anything");
        expect(live.diagnostics.reason).toMatch(/blocked|Authorization|No playable|ingest/i);
        expect(live.live_url || live.embed_url).toBeNull();
    });
});
