/*
  Warnings:

  - You are about to drop the column `videosRemaining` on the `MomoCredits` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "MomoCredits" DROP COLUMN "videosRemaining",
ADD COLUMN     "minutesRemaining" INTEGER NOT NULL DEFAULT 0;
