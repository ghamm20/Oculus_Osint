# Citizen Authorized Incident Ingest

Oculus0Osint does not scrape Citizen's private app endpoints. The Citizen layer accepts authorized incident data from either a JSON endpoint or a local export file and presents it as map entities with an incident detail panel.

## Configuration

Set one of these in `.env.local`:

```env
CITIZEN_API_URL=https://your-authorized-export.example/incidents
CITIZEN_API_KEY=
```

or:

```env
CITIZEN_API_BASE_URL=https://your-authorized-export.example
CITIZEN_API_INCIDENTS_PATH=/incidents
CITIZEN_API_KEY=
```

or for a local export:

```env
CITIZEN_FEED_FILE=C:\feeds\citizen-incidents.json
```

The route accepts a GeoJSON `FeatureCollection`, a JSON array, a JSON object with `incidents`, `events`, `items`, `data`, `results`, or `records`, and newline-delimited JSON.

## Useful Fields

Each incident should include coordinates and any of these display fields:

```json
{
  "id": "incident-123",
  "title": "Police Activity",
  "category": "police",
  "severity": "high",
  "status": "active",
  "latitude": 40.7128,
  "longitude": -74.006,
  "address": "Lower Manhattan, New York, NY",
  "description": "Authorized incident export text.",
  "reportedAt": "2026-05-23T23:00:00Z",
  "updatesCount": 3,
  "notifiedCount": 250,
  "reactionsCount": 14,
  "sourceUrl": "https://example.com/incidents/incident-123",
  "imageUrl": "https://example.com/incidents/incident-123.jpg",
  "videoUrl": "https://example.com/incidents/incident-123.mp4"
}
```

The UI normalizes these aliases too: `incidentId`, `eventId`, `uuid`, `type`, `incidentType`, `eventType`, `priority`, `level`, `summary`, `details`, `body`, `createdAt`, `timestamp`, `time`, `url`, `shareUrl`, `incidentUrl`, `thumbnailUrl`, `photoUrl`, `liveVideoUrl`, and `mediaUrl`.
