ALTER TABLE "music_videos"
    ADD COLUMN IF NOT EXISTS "visualStyle" TEXT,
    ADD COLUMN IF NOT EXISTS "characters" JSONB;
