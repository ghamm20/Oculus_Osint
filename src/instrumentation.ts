export async function register() {
  // Sentry instrumentation removed (sovereign posture, Phase 1).
  // Local-only telemetry hooks belong here if/when added.
}

export function onRequestError() {
  // No-op: errors are surfaced via Next.js logs only.
}
