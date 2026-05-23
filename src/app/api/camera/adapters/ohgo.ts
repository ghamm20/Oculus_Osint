import { fetchOhgoCameras } from "../ohgo/ohgoFetcher";
import type { CameraAdapter, CameraFeature } from "./types";

export const ohgoAdapter: CameraAdapter = {
    id: "ohgo",
    displayName: "OHGO (Ohio)",
    region: "United States - Ohio",
    requiresKey: {
        envVar: "OHGO_API_KEY",
        signupUrl: "https://publicapi.ohgo.com/docs/registration",
    },
    fetch: async () => (await fetchOhgoCameras()) as CameraFeature[],
};
