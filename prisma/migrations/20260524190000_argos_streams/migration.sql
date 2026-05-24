CREATE TABLE "streams" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "lat" DOUBLE PRECISION,
    "lon" DOUBLE PRECISION,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "provider" TEXT NOT NULL,
    "auth_required" BOOLEAN NOT NULL DEFAULT false,
    "refresh_rate" INTEGER NOT NULL DEFAULT 30,
    "health_status" TEXT NOT NULL DEFAULT 'offline',
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capabilities_json" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "streams_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "streams_provider_idx" ON "streams"("provider");
CREATE INDEX "streams_health_status_idx" ON "streams"("health_status");
