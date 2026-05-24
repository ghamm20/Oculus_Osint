export const aiAnalysisPipeline = {
    hooks: [
        "motion_detection",
        "smoke_fire_detection",
        "vehicle_counting",
        "crowd_density",
        "weather_visibility",
        "anomaly_detection",
        "maritime_activity_correlation",
    ],
    enabled: false,
    reason: "Analysis hooks are registered but inactive until an authorized stream and model pipeline are configured.",
};
