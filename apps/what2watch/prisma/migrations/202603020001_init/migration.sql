-- CreateEnum
CREATE TYPE "TitleType" AS ENUM ('movie', 'tv');
CREATE TYPE "InteractionType" AS ENUM ('like', 'dislike', 'detail', 'watchlist_add', 'watchlist_remove');

CREATE TABLE "Title" (
  "id" TEXT NOT NULL,
  "tmdbId" INTEGER NOT NULL,
  "type" "TitleType" NOT NULL,
  "name" TEXT NOT NULL,
  "overview" TEXT NOT NULL,
  "posterPath" TEXT,
  "backdropPath" TEXT,
  "releaseDate" TIMESTAMP(3),
  "runtime" INTEGER,
  "tmdbPopularity" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tmdbVoteAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tmdbVoteCount" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Title_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Genre" (
  "id" TEXT NOT NULL,
  "tmdbGenreId" INTEGER NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TitleGenre" (
  "titleId" TEXT NOT NULL,
  "genreId" TEXT NOT NULL,
  CONSTRAINT "TitleGenre_pkey" PRIMARY KEY ("titleId","genreId")
);

CREATE TABLE "Availability" (
  "id" TEXT NOT NULL,
  "titleId" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "region" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "leavingDate" TIMESTAMP(3),
  "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Availability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TrendSnapshot" (
  "id" TEXT NOT NULL,
  "titleId" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "trendScore" DOUBLE PRECISION NOT NULL,
  "momentum" DOUBLE PRECISION NOT NULL,
  "components" JSONB NOT NULL,
  CONSTRAINT "TrendSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "anonId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserPreference" (
  "userId" TEXT NOT NULL,
  "genreWeights" JSONB NOT NULL,
  "platformWeights" JSONB NOT NULL,
  "runtimeWeights" JSONB NOT NULL,
  CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("userId")
);

CREATE TABLE "UserInteraction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "titleId" TEXT NOT NULL,
  "type" "InteractionType" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserInteraction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Watchlist" (
  "userId" TEXT NOT NULL,
  "titleId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("userId","titleId")
);

CREATE TABLE "NotificationEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "titleId" TEXT,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "readAt" TIMESTAMP(3),
  CONSTRAINT "NotificationEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Title_tmdbId_type_key" ON "Title"("tmdbId", "type");
CREATE INDEX "Title_type_tmdbPopularity_idx" ON "Title"("type", "tmdbPopularity");
CREATE UNIQUE INDEX "Genre_tmdbGenreId_key" ON "Genre"("tmdbGenreId");
CREATE INDEX "Availability_titleId_region_idx" ON "Availability"("titleId", "region");
CREATE UNIQUE INDEX "TrendSnapshot_titleId_date_key" ON "TrendSnapshot"("titleId", "date");
CREATE INDEX "TrendSnapshot_date_trendScore_idx" ON "TrendSnapshot"("date", "trendScore");
CREATE UNIQUE INDEX "User_anonId_key" ON "User"("anonId");
CREATE INDEX "UserInteraction_userId_createdAt_idx" ON "UserInteraction"("userId", "createdAt");
CREATE INDEX "UserInteraction_titleId_type_idx" ON "UserInteraction"("titleId", "type");
CREATE INDEX "Watchlist_createdAt_idx" ON "Watchlist"("createdAt");
CREATE INDEX "NotificationEvent_userId_createdAt_idx" ON "NotificationEvent"("userId", "createdAt");

ALTER TABLE "TitleGenre" ADD CONSTRAINT "TitleGenre_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TitleGenre" ADD CONSTRAINT "TitleGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Availability" ADD CONSTRAINT "Availability_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TrendSnapshot" ADD CONSTRAINT "TrendSnapshot_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserInteraction" ADD CONSTRAINT "UserInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserInteraction" ADD CONSTRAINT "UserInteraction_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "Title"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "NotificationEvent" ADD CONSTRAINT "NotificationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
