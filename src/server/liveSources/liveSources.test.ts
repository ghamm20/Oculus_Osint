import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLiveSourceCatalog } from "./catalog";
import { getProvider, liveSourceProviders } from "./providers";
import { validateStream } from "./streamValidator";
import { DEFAULT_VISIBLE_PLUGIN_IDS } from "@/plugins/builtin/intelligencePlugins";

describe("ARGOS live source registry", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("loads the provider registry", () => {
        const ids = liveSourceProviders.map((provider) => provider.provider_id);
        expect(ids).toContain("fl511-public");
        expect(ids).toContain("broadcastify");
        expect(ids).toContain("marinecadastre-ais");
        expect(ids).toContain("blocked-insecam");
    });

    it("does not return playable URLs for blocked Insecam", async () => {
        const provider = getProvider("blocked-insecam");
        expect(provider).toBeTruthy();
        const live = await provider!.get_live_url("anything");
        expect(live.legal_status).toBe("blocked");
        expect(live.live_url).toBeNull();
        expect(live.embed_url).toBeNull();
    });

    it("returns normalized catalog entities", async () => {
        const { items } = await fetchLiveSourceCatalog({ provider: "argos-demo", includeSamples: false });
        expect(items.length).toBeGreaterThan(0);
        expect(items[0]).toMatchObject({
            provider: "argos-demo",
            source_page_url: expect.any(String),
            refresh_seconds: expect.any(Number),
            diagnostics: expect.any(Object),
        });
    });

    it("reports empty key-gated providers without sample fallback", async () => {
        const { items, diagnostics } = await fetchLiveSourceCatalog({
            provider: "broadcastify",
            includeSamples: false,
        });
        expect(items).toEqual([]);
        expect(diagnostics.total_before_filter).toBe(0);
    });

    it("FL511 health works against normalized public ArcGIS data", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            json: async () => ({
                exceededTransferLimit: false,
                features: [
                    {
                        attributes: {
                            ID: "cam-1",
                            DESCRIPT: "I-95 test camera",
                            COUNTY: "Miami-Dade",
                            HIGHWAY: "I-95",
                            IMAGE: "https://example.test/cam.jpg",
                        },
                        geometry: { x: -80.2, y: 25.7 },
                    },
                ],
            }),
        })));
        const provider = getProvider("fl511-public");
        const health = await provider!.healthcheck();
        expect(health.status).toBe("healthy");
        expect(health.item_count).toBe(1);
    });

    it("AIS provider returns an honest unavailable state", async () => {
        const provider = getProvider("marinecadastre-ais");
        const health = await provider!.healthcheck();
        expect(health.status).toBe("unavailable");
        expect(health.message).toMatch(/historical/i);
    });

    it("validates browser-playable public stream protocols", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => ({
            ok: true,
            status: 200,
            headers: new Headers({ "content-type": "application/vnd.apple.mpegurl" }),
        })));
        const validation = await validateStream("https://example.test/live/playlist.m3u8");
        expect(validation.ok).toBe(true);
        expect(validation.protocol).toBe("hls");
        expect(validation.capabilities_json.browser_playable).toBe(true);
    });

    it("ARGOS is not hidden as a default-off layer in demo boot config", () => {
        expect(DEFAULT_VISIBLE_PLUGIN_IDS).toContain("argos-live");
    });
});
