-- Phase 301-307 foundational persistence for megaplatform runtime cohesion.

CREATE TYPE "PlatformNotificationStatus" AS ENUM ('UNREAD', 'READ', 'ARCHIVED', 'ACTED');
CREATE TYPE "SquadInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'REVOKED');
CREATE TYPE "EntitlementStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

CREATE TABLE "PlatformSessionGraph" (
  "id" TEXT NOT NULL,
  "sessionKey" TEXT NOT NULL,
  "userId" TEXT,
  "anonId" TEXT,
  "profileId" TEXT,
  "creatorProfileId" TEXT,
  "currentModule" TEXT NOT NULL,
  "sourceModule" TEXT,
  "sourceHref" TEXT,
  "activeTask" TEXT,
  "partyCode" TEXT,
  "squadId" TEXT,
  "stateJson" JSONB,
  "trailJson" JSONB,
  "lastActionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformSessionGraph_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformSessionGraph_sessionKey_key" ON "PlatformSessionGraph"("sessionKey");
CREATE INDEX "PlatformSessionGraph_userId_updatedAt_idx" ON "PlatformSessionGraph"("userId", "updatedAt");
CREATE INDEX "PlatformSessionGraph_anonId_updatedAt_idx" ON "PlatformSessionGraph"("anonId", "updatedAt");
CREATE INDEX "PlatformSessionGraph_creatorProfileId_updatedAt_idx" ON "PlatformSessionGraph"("creatorProfileId", "updatedAt");
CREATE INDEX "PlatformSessionGraph_currentModule_updatedAt_idx" ON "PlatformSessionGraph"("currentModule", "updatedAt");

CREATE TABLE "PlatformPresence" (
  "id" TEXT NOT NULL,
  "sessionKey" TEXT NOT NULL,
  "userId" TEXT,
  "anonId" TEXT,
  "profileId" TEXT,
  "creatorProfileId" TEXT,
  "module" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "deviceLabel" TEXT,
  "metadataJson" JSONB,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformPresence_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformPresence_sessionKey_module_key" ON "PlatformPresence"("sessionKey", "module");
CREATE INDEX "PlatformPresence_userId_lastSeenAt_idx" ON "PlatformPresence"("userId", "lastSeenAt");
CREATE INDEX "PlatformPresence_creatorProfileId_lastSeenAt_idx" ON "PlatformPresence"("creatorProfileId", "lastSeenAt");
CREATE INDEX "PlatformPresence_module_lastSeenAt_idx" ON "PlatformPresence"("module", "lastSeenAt");

CREATE TABLE "PlatformNotification" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "anonId" TEXT,
  "creatorProfileId" TEXT,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "href" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "status" "PlatformNotificationStatus" NOT NULL DEFAULT 'UNREAD',
  "actionLabel" TEXT,
  "payloadJson" JSONB,
  "actedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformNotification_userId_status_createdAt_idx" ON "PlatformNotification"("userId", "status", "createdAt");
CREATE INDEX "PlatformNotification_anonId_status_createdAt_idx" ON "PlatformNotification"("anonId", "status", "createdAt");
CREATE INDEX "PlatformNotification_creatorProfileId_status_createdAt_idx" ON "PlatformNotification"("creatorProfileId", "status", "createdAt");
CREATE INDEX "PlatformNotification_source_createdAt_idx" ON "PlatformNotification"("source", "createdAt");

CREATE TABLE "Squad" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "ownerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Squad_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Squad_slug_key" ON "Squad"("slug");
CREATE INDEX "Squad_ownerId_createdAt_idx" ON "Squad"("ownerId", "createdAt");

CREATE TABLE "SquadMember" (
  "id" TEXT NOT NULL,
  "squadId" TEXT NOT NULL,
  "userId" TEXT,
  "anonId" TEXT,
  "displayName" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'member',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SquadMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SquadMember_squadId_createdAt_idx" ON "SquadMember"("squadId", "createdAt");
CREATE INDEX "SquadMember_userId_createdAt_idx" ON "SquadMember"("userId", "createdAt");
CREATE UNIQUE INDEX "SquadMember_squadId_userId_anonId_key" ON "SquadMember"("squadId", "userId", "anonId");

CREATE TABLE "SquadInvite" (
  "id" TEXT NOT NULL,
  "squadId" TEXT NOT NULL,
  "inviterUserId" TEXT,
  "inviteeUserId" TEXT,
  "inviteeAnonId" TEXT,
  "inviteeLabel" TEXT NOT NULL,
  "status" "SquadInviteStatus" NOT NULL DEFAULT 'PENDING',
  "targetModule" TEXT,
  "targetHref" TEXT,
  "message" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),
  CONSTRAINT "SquadInvite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SquadInvite_squadId_createdAt_idx" ON "SquadInvite"("squadId", "createdAt");
CREATE INDEX "SquadInvite_inviteeUserId_status_createdAt_idx" ON "SquadInvite"("inviteeUserId", "status", "createdAt");
CREATE INDEX "SquadInvite_inviteeAnonId_status_createdAt_idx" ON "SquadInvite"("inviteeAnonId", "status", "createdAt");

CREATE TABLE "PlatformEntitlement" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "anonId" TEXT,
  "creatorProfileId" TEXT,
  "entitlementKey" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "status" "EntitlementStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3),
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformEntitlement_userId_status_updatedAt_idx" ON "PlatformEntitlement"("userId", "status", "updatedAt");
CREATE INDEX "PlatformEntitlement_anonId_status_updatedAt_idx" ON "PlatformEntitlement"("anonId", "status", "updatedAt");
CREATE INDEX "PlatformEntitlement_creatorProfileId_status_updatedAt_idx" ON "PlatformEntitlement"("creatorProfileId", "status", "updatedAt");
CREATE INDEX "PlatformEntitlement_entitlementKey_status_updatedAt_idx" ON "PlatformEntitlement"("entitlementKey", "status", "updatedAt");

CREATE TABLE "PlatformLedgerEntry" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "anonId" TEXT,
  "creatorProfileId" TEXT,
  "entryType" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "amount" INTEGER NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD_CENTS',
  "entitlementKey" TEXT,
  "referenceType" TEXT,
  "referenceId" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PlatformLedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlatformLedgerEntry_userId_createdAt_idx" ON "PlatformLedgerEntry"("userId", "createdAt");
CREATE INDEX "PlatformLedgerEntry_creatorProfileId_createdAt_idx" ON "PlatformLedgerEntry"("creatorProfileId", "createdAt");
CREATE INDEX "PlatformLedgerEntry_entryType_createdAt_idx" ON "PlatformLedgerEntry"("entryType", "createdAt");
CREATE INDEX "PlatformLedgerEntry_referenceType_referenceId_createdAt_idx" ON "PlatformLedgerEntry"("referenceType", "referenceId", "createdAt");

ALTER TABLE "SquadMember"
  ADD CONSTRAINT "SquadMember_squadId_fkey"
  FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SquadInvite"
  ADD CONSTRAINT "SquadInvite_squadId_fkey"
  FOREIGN KEY ("squadId") REFERENCES "Squad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
