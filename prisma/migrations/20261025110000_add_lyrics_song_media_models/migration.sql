-- The legacy initial migration creates UsageRecord with a quoted PascalCase
-- table name, while the current Prisma model maps it to usage_records.
DO $$
BEGIN
    IF to_regclass('"usage_records"') IS NULL
       AND to_regclass('"UsageRecord"') IS NOT NULL THEN
        ALTER TABLE "UsageRecord" RENAME TO "usage_records";
    END IF;
END $$;

-- ImageGeneration predates this migration in the schema but is absent from the
-- checked-in migration history, so create it for clean shadow-database replay.
CREATE TABLE IF NOT EXISTS "image_generations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "platformUserId" TEXT,
    "prompt" TEXT NOT NULL,
    "style" TEXT,
    "outputUrl" TEXT,
    "width" INTEGER NOT NULL DEFAULT 1200,
    "height" INTEGER NOT NULL DEFAULT 630,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "sourceApp" TEXT NOT NULL DEFAULT 'zuriah',
    "sourceEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "image_generations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "image_generations_orgId_idx" ON "image_generations"("orgId");
CREATE INDEX IF NOT EXISTS "image_generations_platformUserId_idx" ON "image_generations"("platformUserId");
CREATE INDEX IF NOT EXISTS "image_generations_status_idx" ON "image_generations"("status");

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SongStructureSection" AS ENUM ('VERSE', 'CHORUS', 'BRIDGE', 'PRE_CHORUS', 'OUTRO', 'INTRO', 'HOOK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AssetKind" AS ENUM ('AUDIO', 'IMAGE', 'VIDEO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AssetOrigin" AS ENUM ('UPLOADED', 'AI_GENERATED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "SceneSource" AS ENUM ('AI_VIDEO', 'AI_IMAGE', 'USER_VIDEO', 'USER_IMAGE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'RENDERING', 'COMPLETED', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterEnum
ALTER TYPE "OutputFormat" ADD VALUE IF NOT EXISTS 'FLAC';

-- AlterTable
ALTER TABLE "usage_records"
    ADD COLUMN IF NOT EXISTS "audioSecondsUsed" INTEGER,
    ADD COLUMN IF NOT EXISTS "lyricsGenerationId" TEXT,
    ADD COLUMN IF NOT EXISTS "lyricsUsed" INTEGER,
    ADD COLUMN IF NOT EXISTS "songGenerationId" TEXT,
    ADD COLUMN IF NOT EXISTS "videoSecondsUsed" INTEGER,
    ADD COLUMN IF NOT EXISTS "videoClipGenerationId" TEXT,
    DROP COLUMN IF EXISTS "songsUsed";

-- CreateTable
CREATE TABLE IF NOT EXISTS "lyrics_generations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "platformUserId" TEXT,
    "prompt" TEXT NOT NULL,
    "genre" TEXT,
    "mood" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "targetTempoBpm" INTEGER,
    "targetDurationMs" INTEGER,
    "lyrics" TEXT,
    "temperature" DOUBLE PRECISION,
    "topP" DOUBLE PRECISION,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "sourceApp" TEXT NOT NULL DEFAULT 'studio',
    "sourceEntityId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lyrics_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "song_generations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "platformUserId" TEXT,
    "seed" INTEGER,
    "lyrics" TEXT NOT NULL,
    "stylePrompt" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "tempoBpm" INTEGER,
    "targetDurationSeconds" INTEGER,
    "voiceId" TEXT,
    "voiceName" TEXT,
    "vocalStyle" TEXT,
    "provider" TEXT NOT NULL,
    "providerJobId" TEXT,
    "outputFormat" "OutputFormat" NOT NULL DEFAULT 'MP3_44100',
    "r2ObjectKey" TEXT,
    "durationSeconds" DOUBLE PRECISION,
    "fileSize" INTEGER,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "sourceApp" TEXT NOT NULL DEFAULT 'studio',
    "sourceEntityId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "song_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "media_assets" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "platformUserId" TEXT,
    "kind" "AssetKind" NOT NULL,
    "origin" "AssetOrigin" NOT NULL,
    "name" TEXT,
    "r2ObjectKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER,
    "durationMs" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "imageGenerationId" TEXT,
    "songGenerationId" TEXT,
    "videoClipGenerationId" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "video_clip_generations" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "platformUserId" TEXT,
    "prompt" TEXT NOT NULL,
    "referenceAssetId" TEXT,
    "aspectRatio" TEXT NOT NULL DEFAULT '16:9',
    "durationSeconds" INTEGER NOT NULL,
    "seed" INTEGER,
    "provider" TEXT NOT NULL,
    "providerJobId" TEXT,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "sourceApp" TEXT NOT NULL DEFAULT 'studio',
    "sourceEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_clip_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "music_videos" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "platformUserId" TEXT,
    "title" TEXT NOT NULL,
    "audioAssetId" TEXT NOT NULL,
    "lyrics" TEXT,
    "aspectRatio" TEXT NOT NULL DEFAULT '16:9',
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "music_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "music_video_scenes" (
    "id" TEXT NOT NULL,
    "musicVideoId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "section" "SongStructureSection",
    "lyricsText" TEXT,
    "visualPrompt" TEXT,
    "source" "SceneSource" NOT NULL,
    "assetId" TEXT,
    "clipGenerationId" TEXT,
    "motion" TEXT,
    "transition" TEXT,
    "status" "GenerationStatus" NOT NULL DEFAULT 'COMPLETED',

    CONSTRAINT "music_video_scenes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "video_renders" (
    "id" TEXT NOT NULL,
    "musicVideoId" TEXT NOT NULL,
    "timeline" JSONB NOT NULL,
    "resolution" TEXT NOT NULL DEFAULT '1080p',
    "r2ObjectKey" TEXT,
    "durationSeconds" DOUBLE PRECISION,
    "fileSize" INTEGER,
    "status" "GenerationStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "video_renders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "lyrics_generations_orgId_idx" ON "lyrics_generations"("orgId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "lyrics_generations_platformUserId_idx" ON "lyrics_generations"("platformUserId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "lyrics_generations_status_idx" ON "lyrics_generations"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "song_generations_orgId_idx" ON "song_generations"("orgId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "song_generations_orgId_createdAt_idx" ON "song_generations"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "song_generations_status_idx" ON "song_generations"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "song_generations_providerJobId_idx" ON "song_generations"("providerJobId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "media_assets_imageGenerationId_key" ON "media_assets"("imageGenerationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "media_assets_songGenerationId_key" ON "media_assets"("songGenerationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "media_assets_videoClipGenerationId_key" ON "media_assets"("videoClipGenerationId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "media_assets_orgId_kind_idx" ON "media_assets"("orgId", "kind");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "media_assets_orgId_createdAt_idx" ON "media_assets"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "video_clip_generations_orgId_createdAt_idx" ON "video_clip_generations"("orgId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "video_clip_generations_status_idx" ON "video_clip_generations"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "video_clip_generations_providerJobId_idx" ON "video_clip_generations"("providerJobId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "music_videos_orgId_createdAt_idx" ON "music_videos"("orgId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "music_video_scenes_musicVideoId_position_key" ON "music_video_scenes"("musicVideoId", "position");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "video_renders_musicVideoId_idx" ON "video_renders"("musicVideoId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "usage_records_lyricsGenerationId_key" ON "usage_records"("lyricsGenerationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "usage_records_songGenerationId_key" ON "usage_records"("songGenerationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "usage_records_videoClipGenerationId_key" ON "usage_records"("videoClipGenerationId");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_records_lyricsGenerationId_fkey') THEN
        ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_lyricsGenerationId_fkey" FOREIGN KEY ("lyricsGenerationId") REFERENCES "lyrics_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

-- AddForeignKey
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_records_songGenerationId_fkey') THEN
        ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_songGenerationId_fkey" FOREIGN KEY ("songGenerationId") REFERENCES "song_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

-- AddForeignKey
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'usage_records_videoClipGenerationId_fkey') THEN
        ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_videoClipGenerationId_fkey" FOREIGN KEY ("videoClipGenerationId") REFERENCES "video_clip_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

-- AddForeignKey
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'song_generations_voiceId_fkey') THEN
        ALTER TABLE "song_generations" ADD CONSTRAINT "song_generations_voiceId_fkey" FOREIGN KEY ("voiceId") REFERENCES "Voice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

-- AddForeignKey
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_imageGenerationId_fkey') THEN
        ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_imageGenerationId_fkey" FOREIGN KEY ("imageGenerationId") REFERENCES "image_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

-- AddForeignKey
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_songGenerationId_fkey') THEN
        ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_songGenerationId_fkey" FOREIGN KEY ("songGenerationId") REFERENCES "song_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

-- AddForeignKey
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'media_assets_videoClipGenerationId_fkey') THEN
        ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_videoClipGenerationId_fkey" FOREIGN KEY ("videoClipGenerationId") REFERENCES "video_clip_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

-- AddForeignKey
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_clip_generations_referenceAssetId_fkey') THEN
        ALTER TABLE "video_clip_generations" ADD CONSTRAINT "video_clip_generations_referenceAssetId_fkey" FOREIGN KEY ("referenceAssetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

-- AddForeignKey
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'music_videos_audioAssetId_fkey') THEN
        ALTER TABLE "music_videos" ADD CONSTRAINT "music_videos_audioAssetId_fkey" FOREIGN KEY ("audioAssetId") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

-- AddForeignKey
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'music_video_scenes_musicVideoId_fkey') THEN
        ALTER TABLE "music_video_scenes" ADD CONSTRAINT "music_video_scenes_musicVideoId_fkey" FOREIGN KEY ("musicVideoId") REFERENCES "music_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

-- AddForeignKey
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'music_video_scenes_assetId_fkey') THEN
        ALTER TABLE "music_video_scenes" ADD CONSTRAINT "music_video_scenes_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

-- AddForeignKey
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'music_video_scenes_clipGenerationId_fkey') THEN
        ALTER TABLE "music_video_scenes" ADD CONSTRAINT "music_video_scenes_clipGenerationId_fkey" FOREIGN KEY ("clipGenerationId") REFERENCES "video_clip_generations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

-- AddForeignKey
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'video_renders_musicVideoId_fkey') THEN
        ALTER TABLE "video_renders" ADD CONSTRAINT "video_renders_musicVideoId_fkey" FOREIGN KEY ("musicVideoId") REFERENCES "music_videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
