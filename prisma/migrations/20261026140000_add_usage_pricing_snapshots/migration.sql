ALTER TABLE "usage_records"
    ADD COLUMN IF NOT EXISTS "costMicroUsd" INTEGER,
    ADD COLUMN IF NOT EXISTS "chargedUgx" INTEGER;

ALTER TABLE "image_generations"
    ADD COLUMN IF NOT EXISTS "costMicroUsd" INTEGER,
    ADD COLUMN IF NOT EXISTS "costUgx" INTEGER,
    ADD COLUMN IF NOT EXISTS "priceUgx" INTEGER,
    ADD COLUMN IF NOT EXISTS "priceUsdCents" INTEGER,
    ADD COLUMN IF NOT EXISTS "pricingRail" TEXT;

ALTER TABLE "song_generations"
    ADD COLUMN IF NOT EXISTS "costMicroUsd" INTEGER,
    ADD COLUMN IF NOT EXISTS "costUgx" INTEGER,
    ADD COLUMN IF NOT EXISTS "priceUgx" INTEGER,
    ADD COLUMN IF NOT EXISTS "priceUsdCents" INTEGER,
    ADD COLUMN IF NOT EXISTS "pricingRail" TEXT;

ALTER TABLE "video_clip_generations"
    ADD COLUMN IF NOT EXISTS "resolution" TEXT NOT NULL DEFAULT '480p',
    ADD COLUMN IF NOT EXISTS "costMicroUsd" INTEGER,
    ADD COLUMN IF NOT EXISTS "costUgx" INTEGER,
    ADD COLUMN IF NOT EXISTS "priceUgx" INTEGER,
    ADD COLUMN IF NOT EXISTS "priceUsdCents" INTEGER,
    ADD COLUMN IF NOT EXISTS "pricingRail" TEXT;

UPDATE "video_clip_generations"
SET "priceUgx" = "billingCostUgx"
WHERE "priceUgx" IS NULL AND "billingCostUgx" IS NOT NULL;
