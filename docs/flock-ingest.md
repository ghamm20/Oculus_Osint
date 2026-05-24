# Flock Authorized ALPR Ingest

Oculus0Osint does not scrape Flock Safety private endpoints or bypass access controls. The Flock layer accepts authorized ALPR observations from an API or local export file and presents them as map entities.

Flock's public API and integration policy restricts use, sharing, scraping, and bulk extraction outside authorized terms. Only connect data that you are allowed to access and display.

## Configuration

Set one of these in `.env.local`:

```env
FLOCK_API_URL=https://your-authorized-export.example/events
FLOCK_API_KEY=
```

or:

```env
FLOCK_API_BASE_URL=https://your-authorized-export.example
FLOCK_API_EVENTS_PATH=/events
FLOCK_API_KEY=
```

or for a local export:

```env
FLOCK_FEED_FILE=C:\feeds\flock-observations.json
```

Plate values are masked by default. To show full plate text in a private, authorized local environment:

```env
FLOCK_SHOW_FULL_PLATE=true
```

## Accepted Formats

The route accepts a GeoJSON `FeatureCollection`, a JSON array, a JSON object with `observations`, `detections`, `reads`, `hits`, `events`, `items`, `data`, `results`, or `records`, and newline-delimited JSON.

## Useful Fields

```json
{
  "id": "read-123",
  "plate": "ABC1234",
  "plateState": "NY",
  "vehicle": {
    "make": "Toyota",
    "model": "Camry",
    "color": "Blue"
  },
  "camera": {
    "id": "camera-9",
    "name": "Main St East",
    "latitude": 40.7128,
    "longitude": -74.006
  },
  "observedAt": "2026-05-23T23:00:00Z",
  "hotlistHit": false,
  "confidence": 94,
  "imageUrl": "https://example.com/alpr/read-123.jpg",
  "sourceUrl": "https://example.com/alpr/read-123"
}
```

The UI also recognizes aliases like `licensePlate`, `plateNumber`, `tag`, `detectionId`, `readId`, `eventId`, `detectedAt`, `timestamp`, `cameraName`, `cameraId`, `agency`, `address`, `direction`, `lane`, `alertType`, and `alertReason`.
