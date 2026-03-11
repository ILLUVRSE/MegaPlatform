-- Persist platform engagement telemetry for cross-app analytics dashboards.
CREATE TABLE "PlatformEvent" (
  "id" TEXT NOT NULL,
  "event" TEXT NOT NULL,
  "module" TEXT NOT NULL,
  "href" TEXT NOT NULL,
  "surface" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PlatformEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformEvent_createdAt_idx" ON "PlatformEvent"("createdAt");
CREATE INDEX "PlatformEvent_event_createdAt_idx" ON "PlatformEvent"("event", "createdAt");
CREATE INDEX "PlatformEvent_module_createdAt_idx" ON "PlatformEvent"("module", "createdAt");
CREATE INDEX "PlatformEvent_surface_createdAt_idx" ON "PlatformEvent"("surface", "createdAt");
