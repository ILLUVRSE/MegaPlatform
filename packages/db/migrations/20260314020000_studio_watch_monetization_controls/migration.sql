CREATE TYPE "WatchMonetizationMode" AS ENUM ('FREE', 'PREMIUM', 'TICKETED');

ALTER TABLE "ShowProject"
ADD COLUMN "monetizationMode" "WatchMonetizationMode" NOT NULL DEFAULT 'FREE',
ADD COLUMN "priceCents" INTEGER,
ADD COLUMN "currency" TEXT,
ADD COLUMN "adsEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "ShowEpisode"
ADD COLUMN "monetizationMode" "WatchMonetizationMode" NOT NULL DEFAULT 'FREE',
ADD COLUMN "priceCents" INTEGER,
ADD COLUMN "currency" TEXT,
ADD COLUMN "adsEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Show"
ADD COLUMN "monetizationMode" "WatchMonetizationMode" NOT NULL DEFAULT 'FREE',
ADD COLUMN "priceCents" INTEGER,
ADD COLUMN "currency" TEXT,
ADD COLUMN "adsEnabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Episode"
ADD COLUMN "monetizationMode" "WatchMonetizationMode" NOT NULL DEFAULT 'FREE',
ADD COLUMN "priceCents" INTEGER,
ADD COLUMN "currency" TEXT,
ADD COLUMN "adsEnabled" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Show"
SET
  "monetizationMode" = CASE
    WHEN "isPremium" THEN 'PREMIUM'::"WatchMonetizationMode"
    ELSE 'FREE'::"WatchMonetizationMode"
  END,
  "priceCents" = "price",
  "currency" = CASE
    WHEN "price" IS NOT NULL THEN 'USD'
    ELSE NULL
  END;
