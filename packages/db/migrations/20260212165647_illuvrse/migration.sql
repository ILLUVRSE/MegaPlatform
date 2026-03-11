-- MIGRATION_ALLOW_DESTRUCTIVE: legacy FK constraint recreation to enforce explicit ON DELETE behavior.
-- DropForeignKey
ALTER TABLE "LiveProgram" DROP CONSTRAINT "LiveProgram_channelId_fkey";

-- DropForeignKey
ALTER TABLE "ShortPurchase" DROP CONSTRAINT "ShortPurchase_shortPostId_fkey";

-- AddForeignKey
ALTER TABLE "ShortPurchase" ADD CONSTRAINT "ShortPurchase_shortPostId_fkey" FOREIGN KEY ("shortPostId") REFERENCES "ShortPost"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveProgram" ADD CONSTRAINT "LiveProgram_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "LiveChannel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
