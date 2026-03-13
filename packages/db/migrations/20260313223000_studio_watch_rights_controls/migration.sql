CREATE TYPE "ContentVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'UNLISTED');

ALTER TABLE "ShowProject"
ADD COLUMN "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN "allowedRegions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "requiresEntitlement" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ShowEpisode"
ADD COLUMN "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN "allowedRegions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "requiresEntitlement" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Show"
ADD COLUMN "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN "allowedRegions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "requiresEntitlement" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Episode"
ADD COLUMN "visibility" "ContentVisibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN "allowedRegions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "requiresEntitlement" BOOLEAN NOT NULL DEFAULT false;
