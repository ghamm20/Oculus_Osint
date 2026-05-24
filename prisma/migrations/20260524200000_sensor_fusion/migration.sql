CREATE TABLE IF NOT EXISTS "providers" (
    "id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "requires_api_key" BOOLEAN NOT NULL DEFAULT false,
    "terms_url" TEXT,
    "min_refresh_seconds" INTEGER NOT NULL DEFAULT 60,
    "rate_limit_policy" JSONB NOT NULL DEFAULT '{}',
    "failure_policy" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sensor_entities" (
    "id" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "alt" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "speed" DOUBLE PRECISION,
    "status" TEXT,
    "severity" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL,
    "trust_score" DOUBLE PRECISION NOT NULL,
    "freshness_score" DOUBLE PRECISION NOT NULL,
    "last_seen" TIMESTAMP(3) NOT NULL,
    "first_seen" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "source_page_url" TEXT,
    "live_url" TEXT,
    "embed_url" TEXT,
    "thumbnail_url" TEXT,
    "requires_user_click" BOOLEAN NOT NULL DEFAULT true,
    "legal_status" TEXT NOT NULL,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "raw" JSONB NOT NULL DEFAULT '{}',
    "diagnostics" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "sensor_entities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "sensor_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entity_id" TEXT,
    "provider" TEXT,
    "severity" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "location" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "sensor_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "provider_health" (
    "provider_id" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "source_type" TEXT NOT NULL,
    "health" TEXT NOT NULL,
    "requires_api_key" BOOLEAN NOT NULL DEFAULT false,
    "terms_url" TEXT,
    "last_refresh" TIMESTAMP(3),
    "next_refresh" TIMESTAMP(3),
    "entity_count" INTEGER NOT NULL DEFAULT 0,
    "stale_count" INTEGER NOT NULL DEFAULT 0,
    "refresh_interval_seconds" INTEGER NOT NULL DEFAULT 60,
    "error_state" TEXT,
    "message" TEXT NOT NULL,
    "diagnostics" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "provider_health_pkey" PRIMARY KEY ("provider_id")
);

CREATE TABLE IF NOT EXISTS "correlations" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "entities" JSONB NOT NULL DEFAULT '[]',
    "bbox" JSONB,
    "time_start" TIMESTAMP(3) NOT NULL,
    "time_end" TIMESTAMP(3) NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,
    "reasoning_summary" TEXT NOT NULL,
    "recommended_action" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "correlations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "anomalies" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "entities" JSONB NOT NULL DEFAULT '[]',
    "provider" TEXT,
    "severity" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "rule_id" TEXT NOT NULL,
    "heuristic" BOOLEAN NOT NULL DEFAULT true,
    "diagnostics" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "anomalies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "operator_briefs" (
    "id" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL,
    "top_items" JSONB NOT NULL DEFAULT '[]',
    "source_health_summary" JSONB NOT NULL DEFAULT '{}',
    "stale_data_warning" TEXT,
    CONSTRAINT "operator_briefs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "replay_updates" (
    "id" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "entity" JSONB,
    "event" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "replay_updates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "user_streams" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "provider" TEXT NOT NULL DEFAULT 'user-streams',
    "auth_required" BOOLEAN NOT NULL DEFAULT false,
    "refresh_rate" INTEGER NOT NULL DEFAULT 30,
    "health_status" TEXT NOT NULL DEFAULT 'offline',
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capabilities_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "user_streams_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sensor_entities_provider_idx" ON "sensor_entities"("provider");
CREATE INDEX IF NOT EXISTS "sensor_entities_source_type_idx" ON "sensor_entities"("source_type");
CREATE INDEX IF NOT EXISTS "sensor_entities_severity_idx" ON "sensor_entities"("severity");
CREATE INDEX IF NOT EXISTS "sensor_entities_last_seen_idx" ON "sensor_entities"("last_seen");
CREATE INDEX IF NOT EXISTS "sensor_events_type_idx" ON "sensor_events"("type");
CREATE INDEX IF NOT EXISTS "sensor_events_provider_idx" ON "sensor_events"("provider");
CREATE INDEX IF NOT EXISTS "sensor_events_created_at_idx" ON "sensor_events"("created_at");
CREATE INDEX IF NOT EXISTS "provider_health_health_idx" ON "provider_health"("health");
CREATE INDEX IF NOT EXISTS "correlations_severity_idx" ON "correlations"("severity");
CREATE INDEX IF NOT EXISTS "correlations_created_at_idx" ON "correlations"("created_at");
CREATE INDEX IF NOT EXISTS "anomalies_provider_idx" ON "anomalies"("provider");
CREATE INDEX IF NOT EXISTS "anomalies_severity_idx" ON "anomalies"("severity");
CREATE INDEX IF NOT EXISTS "anomalies_created_at_idx" ON "anomalies"("created_at");
CREATE INDEX IF NOT EXISTS "operator_briefs_mode_idx" ON "operator_briefs"("mode");
CREATE INDEX IF NOT EXISTS "operator_briefs_generated_at_idx" ON "operator_briefs"("generated_at");
CREATE INDEX IF NOT EXISTS "replay_updates_provider_idx" ON "replay_updates"("provider");
CREATE INDEX IF NOT EXISTS "replay_updates_type_idx" ON "replay_updates"("type");
CREATE INDEX IF NOT EXISTS "replay_updates_recorded_at_idx" ON "replay_updates"("recorded_at");
CREATE INDEX IF NOT EXISTS "user_streams_provider_idx" ON "user_streams"("provider");
CREATE INDEX IF NOT EXISTS "user_streams_health_status_idx" ON "user_streams"("health_status");
