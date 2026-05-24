import { NextResponse } from "next/server";

export const revalidate = 300;
export const dynamic = "force-dynamic";

const FAA_SITES_URL = "https://weathercams.faa.gov/api/sites";

interface FaaWeatherCamera {
    cameraId?: number | string;
    cameraName?: string;
    cameraDirection?: string;
    cameraBearing?: number;
    cameraLastSuccess?: string;
    cameraInMaintenance?: boolean;
    cameraOutOfOrder?: boolean;
    siteId?: number | string;
    latitude?: number | string;
    longitude?: number | string;
}

interface FaaWeatherSite {
    siteId?: number | string;
    siteName?: string;
    siteArea?: string;
    siteIdentifier?: string;
    icao?: string;
    latitude?: number | string;
    longitude?: number | string;
    elevation?: number | string;
    siteInMaintenance?: boolean;
    siteActive?: boolean;
    thirdParty?: boolean;
    country?: string;
    state?: string;
    operatedBy?: string;
    cameras?: FaaWeatherCamera[];
}

interface WeatherCameraFeature {
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: {
        type: "Point";
        coordinates: [number, number, number];
    };
}

function finiteNumber(value: unknown): number | undefined {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return undefined;
}

function cameraLabel(site: FaaWeatherSite, camera: FaaWeatherCamera): string {
    return [
        site.siteName ?? site.siteArea ?? site.icao ?? "Weather camera",
        camera.cameraDirection ?? camera.cameraName,
    ].filter(Boolean).join(" - ");
}

export async function GET() {
    try {
        const response = await fetch(FAA_SITES_URL, {
            headers: {
                Accept: "application/json",
                Referer: "https://weathercams.faa.gov/cameras",
                "User-Agent": "Oculus0Osint/1.0",
            },
            cache: "no-store",
        });

        if (!response.ok) {
            return NextResponse.json(
                { error: `FAA WeatherCams returned ${response.status}` },
                { status: 502 },
            );
        }

        const data = await response.json();
        const sites = Array.isArray(data?.payload) ? data.payload as FaaWeatherSite[] : [];
        const features: WeatherCameraFeature[] = [];

        for (const site of sites) {
            if (site.siteActive === false || site.siteInMaintenance) continue;

            const siteLat = finiteNumber(site.latitude);
            const siteLon = finiteNumber(site.longitude);
            const cameras = Array.isArray(site.cameras) ? site.cameras : [];

            for (const camera of cameras) {
                if (camera.cameraOutOfOrder || camera.cameraInMaintenance) continue;

                const lat = finiteNumber(camera.latitude) ?? siteLat;
                const lon = finiteNumber(camera.longitude) ?? siteLon;
                if (lat === undefined || lon === undefined) continue;

                const fallbackCameraId = `${site.siteId ?? "site"}-${features.length}`;
                const cameraId = String(camera.cameraId ?? fallbackCameraId);
                const siteId = String(camera.siteId ?? site.siteId ?? "unknown-site");

                features.push({
                    type: "Feature",
                    properties: {
                        id: `${siteId}-${cameraId}`,
                        name: cameraLabel(site, camera),
                        pluginId: "weather-camera",
                        source: "FAA WeatherCams",
                        cameraId,
                        siteId,
                        siteName: site.siteName,
                        siteArea: site.siteArea,
                        siteIdentifier: site.siteIdentifier,
                        icao: site.icao,
                        country: site.country,
                        state: site.state,
                        operatedBy: site.operatedBy,
                        thirdParty: site.thirdParty === true,
                        direction: camera.cameraDirection,
                        bearing: camera.cameraBearing,
                        heading: camera.cameraBearing,
                        elevation: finiteNumber(site.elevation),
                        imageUrl: `/api/weather-cameras/image?cameraId=${encodeURIComponent(cameraId)}`,
                        sourceUrl: "https://weathercams.faa.gov/cameras",
                        time: camera.cameraLastSuccess,
                    },
                    geometry: {
                        type: "Point",
                        coordinates: [lon, lat, finiteNumber(site.elevation) ?? 0],
                    },
                });
            }
        }

        return NextResponse.json({
            type: "FeatureCollection",
            features,
            metadata: {
                count: features.length,
                sites: sites.length,
                source: FAA_SITES_URL,
                refreshedAt: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error("[WeatherCamerasRoute] Error:", error);
        return NextResponse.json(
            { error: "Failed to fetch FAA weather cameras" },
            { status: 502 },
        );
    }
}
