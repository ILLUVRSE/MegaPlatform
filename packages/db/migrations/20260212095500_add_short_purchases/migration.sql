-- CreateTable
CREATE TABLE "ShortPurchase" (
    "id" TEXT NOT NULL,
    "shortPostId" TEXT NOT NULL,
    "buyerId" TEXT,
    "buyerAnonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShortPurchase_shortPostId_idx" ON "ShortPurchase"("shortPostId");

-- CreateIndex
CREATE INDEX "ShortPurchase_buyerId_idx" ON "ShortPurchase"("buyerId");

-- CreateIndex
CREATE INDEX "ShortPurchase_buyerAnonId_idx" ON "ShortPurchase"("buyerAnonId");

-- AddForeignKey
ALTER TABLE "ShortPurchase" ADD CONSTRAINT "ShortPurchase_shortPostId_fkey" FOREIGN KEY ("shortPostId") REFERENCES "ShortPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;
