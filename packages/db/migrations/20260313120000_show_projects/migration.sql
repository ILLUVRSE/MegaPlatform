-- CreateEnum
CREATE TYPE "ShowProjectFormat" AS ENUM ('SERIES', 'MOVIE');

-- CreateEnum
CREATE TYPE "ShowProjectStatus" AS ENUM ('DRAFT', 'IN_PRODUCTION', 'READY_TO_PUBLISH', 'PUBLISHED');

-- CreateTable
CREATE TABLE "ShowProject" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "format" "ShowProjectFormat" NOT NULL,
    "status" "ShowProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "ownerId" TEXT NOT NULL,
    "posterImageUrl" TEXT,
    "bannerImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowProject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShowProject_slug_key" ON "ShowProject"("slug");

-- CreateIndex
CREATE INDEX "ShowProject_ownerId_createdAt_idx" ON "ShowProject"("ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "ShowProject_status_updatedAt_idx" ON "ShowProject"("status", "updatedAt");

-- AddForeignKey
ALTER TABLE "ShowProject" ADD CONSTRAINT "ShowProject_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
