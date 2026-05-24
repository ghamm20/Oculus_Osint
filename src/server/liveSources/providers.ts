import { fetchFl511PublicCameras } from "@/app/api/camera/fl511Public/fl511PublicFetcher";
import type {
    ArgosEntity,
    CatalogQuery,
    LiveSourceProvider,
    LiveUrlResult,
    ProviderHealth,
} from "./types";
import { listRegisteredStreams, registeredStreamToEntity } from "./streamRegistry";
import { cleanString, finiteNumber, normalizeId, nowIso, providerHealth, unavailableLiveUrl } from "./utils";
import { sampleArgosEntities } from "./samples";

const OPENWEBCAMDB_API_URL = "https://openwebcamdb.com/api/v1/webcams";
const FAA_SITES_URL = "https://weathercams.faa.gov/api/sites";

abstract class BaseProvider implements LiveSourceProvider {
    abstract provider_id: string;
    abstract display_name: string;
    abstract source_type: LiveSourceProvider["source_type"];
    requires_api_key = false;
    terms_url = "";
    cache_ttl_seconds = 900;

    abstract fetch_catalog(query?: CatalogQuery): Promise<ArgosEntity[]>;
    abstract normalize_item(raw: unknown): ArgosEntity | null;

    async get_live_url(item_id: string): Promise<LiveUrlResult> {
        const item = (await this.fetch_catalog({ includeSamples: false })).find((candidate) => candidate.id === item_id);
        if (item) {
            return {
                live_url: item.live_url,
                embed_url: item.embed_url,
                source_page_url: item.source_page_url,
                requires_user_click: item.requires_user_click,
                legal_status: item.legal_status,
                diagnostics: item.diagnostics,
            };
        }
        return unavailableLiveUrl(this.terms_url, "unknown", "Provider exposes catalog/source-page handoff only.");
    }

    async healthcheck(): Promise<ProviderHealth> {
        const items = await this.fetch_catalog({ limit: 1, includeSamples: false });
        return providerHealth({
            provider_id: this.provider_id,
            display_name: this.display_name,
            source_type: this.source_type,
            status: items.length > 0 ? "healthy" : "degraded",
            requires_api_key: this.requires_api_key,
            terms_url: this.terms_url,
            item_count: items.length,
            message: items.length > 0 ? "Provider returned catalog items." : "Provider returned no catalog items.",
            diagnostics: {},
        });
    }
}

class StaticStatusProvider extends BaseProvider {
    constructor(
        readonly provider_id: string,
        readonly display_name: string,
        readonly source_type: LiveSourceProvider["source_type"],
        readonly requires_api_key: boolean,
        readonly terms_url: string,
        private readonly status: ProviderHealth["status"],
        private readonly message: string,
        private readonly legalStatus: "approved" | "api_required" | "blocked" | "unknown" = "unknown",
    ) {
        super();
    }

    async fetch_catalog(): Promise<ArgosEntity[]> {
        return [];
    }

    normalize_item(): ArgosEntity | null {
        return null;
    }

    async get_live_url(): Promise<LiveUrlResult> {
        return unavailableLiveUrl(this.terms_url, this.legalStatus, this.message);
    }

    async healthcheck(): Promise<ProviderHealth> {
        const keyConfigured = !this.requires_api_key || !!process.env[this.provider_id.toUpperCase().replace(/-/g, "_") + "_API_KEY"];
        return providerHealth({
            provider_id: this.provider_id,
            display_name: this.display_name,
            source_type: this.source_type,
            status: this.requires_api_key && !keyConfigured ? "api_required" : this.status,
            requires_api_key: this.requires_api_key,
            terms_url: this.terms_url,
            item_count: null,
            message: this.requires_api_key && !keyConfigured ? "API key or license is required before ARGOS can fetch this catalog." : this.message,
            diagnostics: { legal_status: this.legalStatus },
        });
    }
}

class ArgosDemoProvider extends BaseProvider {
    provider_id = "argos-demo";
    display_name = "ARGOS Safe Demo Layer";
    source_type = "webcam" as const;
    terms_url = "https://github.com/ghamm20/Oculus_Osint";
    cache_ttl_seconds = 60;

    async fetch_catalog(): Promise<ArgosEntity[]> {
        return sampleArgosEntities().filter((item) => item.provider === "argos-demo" || item.id.startsWith("argos-demo:"));
    }

    normalize_item(raw: unknown): ArgosEntity | null {
        return raw && typeof raw === "object" ? raw as ArgosEntity : null;
    }

    async healthcheck(): Promise<ProviderHealth> {
        const items = await this.fetch_catalog();
        return providerHealth({
            provider_id: this.provider_id,
            display_name: this.display_name,
            source_type: this.source_type,
            status: "healthy",
            requires_api_key: false,
            terms_url: this.terms_url,
            item_count: items.length,
            message: "Safe demo entities are available for ARGOS layer verification.",
            diagnostics: { sample: true },
        });
    }
}

class Fl511Provider extends BaseProvider {
    provider_id = "fl511-public";
    display_name = "FL511 Public CCTV";
    source_type = "traffic_camera" as const;
    terms_url = "https://fl511.com/";
    cache_ttl_seconds = 600;

    async fetch_catalog(): Promise<ArgosEntity[]> {
        const cameras = await fetchFl511PublicCameras();
        return cameras.map((camera, index) => this.normalize_item({ camera, index })).filter((item): item is ArgosEntity => !!item);
    }

    normalize_item(raw: unknown): ArgosEntity | null {
        const record = raw as { camera?: any; index?: number };
        const camera = record.camera;
        const p = camera?.properties ?? {};
        const coordinates = camera?.geometry?.coordinates;
        const lon = Array.isArray(coordinates) ? finiteNumber(coordinates[0]) : null;
        const lat = Array.isArray(coordinates) ? finiteNumber(coordinates[1]) : null;
        if (lat === null || lon === null) return null;

        const stream = cleanString(p.stream);
        const title = cleanString(p.name) ?? cleanString(p.location_description) ?? `FL511 CCTV ${record.index ?? ""}`.trim();
        return {
            id: normalizeId(this.provider_id, p.id, record.index ?? title),
            provider: this.provider_id,
            type: "traffic_camera",
            title,
            description: cleanString(p.location_description),
            lat,
            lon,
            city: cleanString(p.city),
            state: "FL",
            country: cleanString(p.country) ?? "United States",
            thumbnail_url: stream,
            live_url: stream,
            embed_url: null,
            source_page_url: this.terms_url,
            refresh_seconds: 300,
            requires_user_click: !stream,
            legal_status: "approved",
            last_checked: nowIso(),
            diagnostics: {
                protocol: p.streamType ?? "snapshot",
                route: p.route,
                direction: p.direction,
                source: "FDOT public ArcGIS FeatureServer",
            },
        };
    }

    async get_live_url(item_id: string): Promise<LiveUrlResult> {
        const item = (await this.fetch_catalog()).find((candidate) => candidate.id === item_id);
        if (!item) return unavailableLiveUrl(this.terms_url, "unknown", "Item not found in current FL511 catalog.");
        return {
            live_url: item.live_url,
            embed_url: item.embed_url,
            source_page_url: item.source_page_url,
            requires_user_click: item.requires_user_click,
            legal_status: item.legal_status,
            diagnostics: item.diagnostics,
        };
    }
}

class FaaWeatherCameraProvider extends BaseProvider {
    provider_id = "faa-weather-cameras";
    display_name = "FAA WeatherCams";
    source_type = "webcam" as const;
    terms_url = "https://weathercams.faa.gov/cameras";
    cache_ttl_seconds = 300;

    async fetch_catalog(): Promise<ArgosEntity[]> {
        const response = await fetch(FAA_SITES_URL, {
            headers: {
                Accept: "application/json",
                Referer: "https://weathercams.faa.gov/cameras",
                "User-Agent": "Oculus0Osint-ARGOS/1.0",
            },
            cache: "no-store",
        });
        if (!response.ok) throw new Error(`FAA WeatherCams returned ${response.status}`);
        const data = await response.json();
        const sites = Array.isArray(data?.payload) ? data.payload : [];
        const out: ArgosEntity[] = [];
        for (const site of sites) {
            if (site?.siteActive === false || site?.siteInMaintenance) continue;
            const siteLat = finiteNumber(site?.latitude);
            const siteLon = finiteNumber(site?.longitude);
            const cameras = Array.isArray(site?.cameras) ? site.cameras : [];
            for (const camera of cameras) {
                const normalized = this.normalize_item({ site, camera, siteLat, siteLon, index: out.length });
                if (normalized) out.push(normalized);
            }
        }
        return out;
    }

    normalize_item(raw: unknown): ArgosEntity | null {
        const record = raw as { site?: any; camera?: any; siteLat?: number | null; siteLon?: number | null; index?: number };
        const site = record.site ?? {};
        const camera = record.camera ?? {};
        if (camera.cameraOutOfOrder || camera.cameraInMaintenance) return null;
        const lat = finiteNumber(camera.latitude) ?? record.siteLat ?? null;
        const lon = finiteNumber(camera.longitude) ?? record.siteLon ?? null;
        if (lat === null || lon === null) return null;
        const cameraId = cleanString(camera.cameraId) ?? `${cleanString(site.siteId) ?? "site"}-${record.index ?? 0}`;
        const siteId = cleanString(camera.siteId) ?? cleanString(site.siteId) ?? "unknown-site";
        const title = [cleanString(site.siteName) ?? cleanString(site.siteArea) ?? cleanString(site.icao) ?? "FAA WeatherCam", cleanString(camera.cameraDirection) ?? cleanString(camera.cameraName)].filter(Boolean).join(" - ");
        return {
            id: normalizeId(this.provider_id, `${siteId}-${cameraId}`, record.index ?? 0),
            provider: this.provider_id,
            type: "webcam",
            title,
            description: cleanString(site.operatedBy),
            lat,
            lon,
            city: cleanString(site.siteArea),
            state: cleanString(site.state),
            country: cleanString(site.country) ?? "United States",
            thumbnail_url: `/api/weather-cameras/image?cameraId=${encodeURIComponent(cameraId)}`,
            live_url: `/api/weather-cameras/image?cameraId=${encodeURIComponent(cameraId)}`,
            embed_url: null,
            source_page_url: this.terms_url,
            refresh_seconds: 300,
            requires_user_click: false,
            legal_status: "approved",
            last_checked: nowIso(),
            diagnostics: {
                protocol: "snapshot",
                cameraId,
                siteId,
                bearing: camera.cameraBearing,
                thirdParty: site.thirdParty === true,
            },
        };
    }
}

class OpenWebcamDbProvider extends BaseProvider {
    provider_id = "openwebcamdb";
    display_name = "OpenWebcamDB";
    source_type = "webcam" as const;
    requires_api_key = true;
    terms_url = "https://openwebcamdb.com/api/docs";
    cache_ttl_seconds = 3600;

    async fetch_catalog(): Promise<ArgosEntity[]> {
        const key = process.env.OPENWEBCAMDB_API_KEY;
        if (!key) return [];
        const url = new URL(process.env.OPENWEBCAMDB_API_URL ?? OPENWEBCAMDB_API_URL);
        url.searchParams.set("per_page", "50");
        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${key}`,
                "User-Agent": "Oculus0Osint-ARGOS/1.0",
            },
            next: { revalidate: 3600 },
        });
        if (!response.ok) throw new Error(`OpenWebcamDB returned ${response.status}`);
        const data = await response.json();
        const rows = Array.isArray(data?.data) ? data.data : Array.isArray(data?.webcams) ? data.webcams : Array.isArray(data) ? data : [];
        return rows
            .map((row: unknown, index: number) => this.normalize_item({ row, index }))
            .filter((item: ArgosEntity | null): item is ArgosEntity => !!item);
    }

    normalize_item(raw: unknown): ArgosEntity | null {
        const record = raw as { row?: Record<string, unknown>; index?: number };
        const row = record.row ?? {};
        const lat = finiteNumber(row.lat ?? row.latitude);
        const lon = finiteNumber(row.lon ?? row.longitude ?? row.lng);
        const title = cleanString(row.title ?? row.name) ?? `OpenWebcamDB camera ${record.index ?? ""}`.trim();
        return {
            id: normalizeId(this.provider_id, row.id ?? row.slug, record.index ?? title),
            provider: this.provider_id,
            type: "webcam",
            title,
            description: cleanString(row.description),
            lat,
            lon,
            city: cleanString(row.city),
            state: cleanString(row.state ?? row.region),
            country: cleanString(row.country),
            thumbnail_url: cleanString(row.thumbnail_url ?? row.thumbnail ?? row.image_url),
            live_url: cleanString(row.live_url ?? row.stream_url),
            embed_url: cleanString(row.embed_url),
            source_page_url: cleanString(row.source_page_url ?? row.url) ?? "https://openwebcamdb.com/",
            refresh_seconds: 3600,
            requires_user_click: !row.live_url && !row.embed_url,
            legal_status: "api_required",
            last_checked: nowIso(),
            diagnostics: { attribution: "Powered by OpenWebcamDB.com", commercial_use: "restricted" },
        };
    }

    async healthcheck(): Promise<ProviderHealth> {
        if (!process.env.OPENWEBCAMDB_API_KEY) {
            return providerHealth({
                provider_id: this.provider_id,
                display_name: this.display_name,
                source_type: this.source_type,
                status: "api_required",
                requires_api_key: true,
                terms_url: this.terms_url,
                item_count: null,
                message: "OPENWEBCAMDB_API_KEY is required; attribution and caching rules apply.",
                diagnostics: { attribution_required: true, cache_max_seconds_free_tier: 3600 },
            });
        }
        return super.healthcheck();
    }
}

class UserStreamsProvider extends BaseProvider {
    provider_id = "user-streams";
    display_name = "User Added Public Streams";
    source_type = "webcam" as const;
    terms_url = "local://argos/user-streams";
    cache_ttl_seconds = 1;

    async fetch_catalog(): Promise<ArgosEntity[]> {
        return listRegisteredStreams().map(registeredStreamToEntity);
    }

    normalize_item(raw: unknown): ArgosEntity | null {
        return raw && typeof raw === "object" ? raw as ArgosEntity : null;
    }

    async healthcheck(): Promise<ProviderHealth> {
        const items = await this.fetch_catalog();
        return providerHealth({
            provider_id: this.provider_id,
            display_name: this.display_name,
            source_type: this.source_type,
            status: items.length ? "healthy" : "degraded",
            requires_api_key: false,
            terms_url: this.terms_url,
            item_count: items.length,
            message: items.length ? "User-added streams are registered in memory." : "No user-added streams registered.",
            diagnostics: { storage: "in-memory-local-runtime" },
        });
    }
}

export const liveSourceProviders: LiveSourceProvider[] = [
    new ArgosDemoProvider(),
    new Fl511Provider(),
    new FaaWeatherCameraProvider(),
    new OpenWebcamDbProvider(),
    new UserStreamsProvider(),
    new StaticStatusProvider(
        "earthcam",
        "EarthCam Partner API",
        "webcam",
        true,
        "https://www.earthcam.net/api/",
        "api_required",
        "EarthCam live embedding/API access requires partner licensing; ARGOS only links to source pages without a license.",
        "api_required",
    ),
    new StaticStatusProvider(
        "outdooractive",
        "Outdooractive Webcams",
        "webcam",
        true,
        "https://developers.outdooractive.com/API-Reference/Data-API.html",
        "api_required",
        "Outdooractive Data API requires an API key and project key.",
        "api_required",
    ),
    new StaticStatusProvider(
        "skyline",
        "Skyline Webcams",
        "webcam",
        false,
        "https://www.skylinewebcams.com/terms-of-use.html",
        "degraded",
        "No approved public catalog API is configured; source-page handoff only.",
        "unknown",
    ),
    new StaticStatusProvider(
        "flfirefighters",
        "Florida Firefighters Public Feeds",
        "audio",
        false,
        "https://mcfrlive.com/",
        "degraded",
        "ARGOS treats public fire-feed pages as source-page handoffs unless an approved data feed is configured.",
        "unknown",
    ),
    new StaticStatusProvider(
        "broadcastify",
        "Broadcastify Live Audio Catalog",
        "audio",
        true,
        "https://support.broadcastify.com/hc/en-us/articles/204740425-Live-Audio-Feed-Catalog-API",
        "api_required",
        "Broadcastify catalog access requires approval/licensing and does not include live audio streaming.",
        "api_required",
    ),
    new StaticStatusProvider(
        "marinecadastre-ais",
        "MarineCadastre AccessAIS",
        "ais",
        false,
        "https://marinecadastre.gov/accessais/",
        "unavailable",
        "AccessAIS is historical/order-based data, not a real-time AIS stream. Live AIS endpoint reports unavailable honestly.",
        "approved",
    ),
    new StaticStatusProvider(
        "blocked-insecam",
        "Blocked Insecam Directory",
        "blocked",
        false,
        "https://www.insecam.org/",
        "blocked",
        "Blocked by design. ARGOS will not ingest exposed camera directories or return playable URLs.",
        "blocked",
    ),
];

export function getProvider(providerId: string): LiveSourceProvider | undefined {
    return liveSourceProviders.find((provider) => provider.provider_id === providerId);
}

export function providerSummary(provider: LiveSourceProvider) {
    return {
        provider_id: provider.provider_id,
        display_name: provider.display_name,
        source_type: provider.source_type,
        requires_api_key: provider.requires_api_key,
        terms_url: provider.terms_url,
        cache_ttl_seconds: provider.cache_ttl_seconds ?? 900,
    };
}
