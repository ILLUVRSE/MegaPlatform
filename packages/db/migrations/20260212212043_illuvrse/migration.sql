-- CreateEnum
CREATE TYPE "UserGameStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateTable
CREATE TABLE "UserGame" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT,
    "ownerKey" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "UserGameStatus" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "seed" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "specJson" JSONB NOT NULL,
    "thumbnailUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "UserGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserGameVersion" (
    "id" TEXT NOT NULL,
    "userGameId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "specJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserGameVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserGame_ownerId_idx" ON "UserGame"("ownerId");

-- CreateIndex
CREATE INDEX "UserGame_ownerKey_idx" ON "UserGame"("ownerKey");

-- CreateIndex
CREATE INDEX "UserGame_status_publishedAt_idx" ON "UserGame"("status", "publishedAt");

-- CreateIndex
CREATE INDEX "UserGameVersion_userGameId_version_idx" ON "UserGameVersion"("userGameId", "version");

-- AddForeignKey
ALTER TABLE "UserGame" ADD CONSTRAINT "UserGame_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserGameVersion" ADD CONSTRAINT "UserGameVersion_userGameId_fkey" FOREIGN KEY ("userGameId") REFERENCES "UserGame"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
