import { fetchChartCameras } from "../chart/chartFetcher";
import type { CameraAdapter, CameraFeature } from "./types";

export const chartAdapter: CameraAdapter = {
    id: "chart-md",
    displayName: "Maryland CHART",
    region: "United States - Maryland",
    country: "United States",
    state: "MD",
    priority: "expanded",
    fetch: async () => (await fetchChartCameras()) as CameraFeature[],
};
