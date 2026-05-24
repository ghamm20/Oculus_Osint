import { fetchFl511Cameras } from "../fl511/fl511Fetcher";
import type { CameraAdapter, CameraFeature } from "./types";

export const fl511Adapter: CameraAdapter = {
    id: "fl511",
    displayName: "FL511 (Florida)",
    region: "United States - Florida",
    country: "United States",
    state: "FL",
    priority: "expanded",
    requiresKey: {
        envVar: "FL511_API_KEY",
        signupUrl: "https://fl511.com/developers/doc",
    },
    fetch: async () => (await fetchFl511Cameras()) as CameraFeature[],
};
