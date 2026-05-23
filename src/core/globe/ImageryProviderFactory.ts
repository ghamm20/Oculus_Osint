import {
    BingMapsImageryProvider,
    IonImageryProvider,
    OpenStreetMapImageryProvider,
    ArcGisMapServerImageryProvider,
    UrlTemplateImageryProvider,
    BingMapsStyle,
} from "cesium";

export interface ImageryLayerEntry {
    id: string;
    name: string;
    description: string;
    thumbnail?: string;
    type: "google-3d" | "imagery";
}

export const IMAGERY_LAYERS: ImageryLayerEntry[] = [
    {
        id: "google-3d",
        name: "Google Maps 3D",
        description: "Photorealistic 3D Tiles",
        type: "google-3d",
    },
    {
        id: "bing-aerial",
        name: "Bing Maps Aerial",
        description: "High-resolution satellite imagery",
        type: "imagery",
    },
    {
        id: "bing-labels",
        name: "Bing Maps Hybrid",
        description: "Aerial with labels",
        type: "imagery",
    },
    {
        id: "bing-road",
        name: "Bing Maps Roads",
        description: "Standard road map",
        type: "imagery",
    },
    {
        id: "osm",
        name: "OpenStreetMap",
        description: "Community-driven map data",
        type: "imagery",
    },
    {
        id: "arcgis-world",
        name: "ArcGIS World Imagery",
        description: "Esri satellite tiles",
        type: "imagery",
    },
    {
        id: "gibs-viirs-snpp",
        name: "NASA VIIRS SNPP",
        description: "Recent NASA GIBS true-color satellite imagery",
        type: "imagery",
    },
    {
        id: "gibs-viirs-noaa20",
        name: "NASA VIIRS NOAA-20",
        description: "Recent NASA GIBS true-color satellite imagery",
        type: "imagery",
    },
    {
        id: "gibs-modis-terra",
        name: "NASA MODIS Terra",
        description: "Recent NASA GIBS true-color satellite imagery",
        type: "imagery",
    },
    {
        id: "gibs-modis-aqua",
        name: "NASA MODIS Aqua",
        description: "Recent NASA GIBS true-color satellite imagery",
        type: "imagery",
    },
    {
        id: "blue-marble",
        name: "Blue Marble",
        description: "NASA Earth imagery",
        type: "imagery",
    }
];

function getGibsDate(daysBack = 2): string {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - daysBack);
    return date.toISOString().slice(0, 10);
}

function createGibsProvider(layer: string) {
    const date = getGibsDate();
    return new UrlTemplateImageryProvider({
        url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
        minimumLevel: 1,
        maximumLevel: 9,
        credit: "NASA Global Imagery Browse Services",
    });
}

export async function createImageryProvider(layerId: string) {
    const bingKey = process.env.NEXT_PUBLIC_BING_MAPS_KEY;

    switch (layerId) {
        case "bing-aerial":
            if (bingKey) {
                return await BingMapsImageryProvider.fromUrl("https://dev.virtualearth.net", {
                    key: bingKey,
                    mapStyle: BingMapsStyle.AERIAL,
                });
            }
            return await IonImageryProvider.fromAssetId(2);

        case "bing-labels":
            if (bingKey) {
                return await BingMapsImageryProvider.fromUrl("https://dev.virtualearth.net", {
                    key: bingKey,
                    mapStyle: BingMapsStyle.AERIAL_WITH_LABELS,
                });
            }
            return await IonImageryProvider.fromAssetId(3);

        case "bing-road":
            if (bingKey) {
                return await BingMapsImageryProvider.fromUrl("https://dev.virtualearth.net", {
                    key: bingKey,
                    mapStyle: BingMapsStyle.ROAD,
                });
            }
            return await IonImageryProvider.fromAssetId(4);

        case "osm":
            return new UrlTemplateImageryProvider({
                url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                subdomains: ["a", "b", "c"]
            });

        case "arcgis-world":
            return await ArcGisMapServerImageryProvider.fromUrl(
                "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer"
            );

        case "gibs-viirs-snpp":
            return createGibsProvider("VIIRS_SNPP_CorrectedReflectance_TrueColor");

        case "gibs-viirs-noaa20":
            return createGibsProvider("VIIRS_NOAA20_CorrectedReflectance_TrueColor");

        case "gibs-modis-terra":
            return createGibsProvider("MODIS_Terra_CorrectedReflectance_TrueColor");

        case "gibs-modis-aqua":
            return createGibsProvider("MODIS_Aqua_CorrectedReflectance_TrueColor");

        case "blue-marble":
            return await IonImageryProvider.fromAssetId(3845);

        default:
            return new UrlTemplateImageryProvider({
                url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                subdomains: ["a", "b", "c"]
            });
    }
}
