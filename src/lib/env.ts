import { z } from "zod";
import { createEnv } from "@t3-oss/env-nextjs";

export const env = createEnv({
  server: {
    // ── Polar (billing) ───────────────────────────────────────────────────────
    POLAR_ACCESS_TOKEN: z.string().min(1),
    POLAR_SERVER: z.enum(["sandbox", "production"]).default("sandbox"),
    POLAR_PRODUCT_ID: z.string().min(1),
    POLAR_METER_VOICE_CREATION: z.string().min(1),
    POLAR_METER_TTS_GENERATION: z.string().min(1),
    POLAR_METER_VIDEO_MINUTES: z.string().min(1),
    POLAR_METER_IMAGE_GENERATION: z.string().min(1),
    POLAR_METER_TEXT_GENERATION: z.string().min(1),

    // ── Database ───────────────────────────────────────────────────────────────
    DATABASE_URL: z.string().min(1),
    APP_URL: z.string().min(1),

    // ── Cloudflare R2 ──────────────────────────────────────────────────────────
    R2_ACCOUNT_ID: z.string().min(1),
    R2_ACCESS_KEY_ID: z.string().min(1),
    R2_SECRET_ACCESS_KEY: z.string().min(1),
    R2_BUCKET_NAME: z.string().min(1),
    R2_ENDPOINT_URL: z.string().url(), // ← added

    // ── Chatterbox (TTS engine — existing) ────────────────────────────────────
    CHATTERBOX_API_URL: z.string().url(),
    CHATTERBOX_API_KEY: z.string().min(1),

    // ── TTS provider (separate from Chatterbox — confirm if duplicate) ────────
    TTS_API_URL: z.string().url(), // ← added
    TTS_API_KEY: z.string().min(1), // ← added
    TTS_VOICE_KEY: z.string().min(1), // ← added

    // ── Hugging Face ───────────────────────────────────────────────────────────
    H_FACE_TOKEN: z.string().min(1), // ← added

    // ── Platform / Instaskul integration ──────────────────────────────────────
    PLATFORM_API_URL: z.string().min(1),
    PLATFORM_API_KEY: z.string().min(1),
    INSTASKUL_URL: z.string().min(1),

    // ── Auth ───────────────────────────────────────────────────────────────────
    CLERK_SECRET_KEY: z.string().min(1),

    // ── MTN MoMo ───────────────────────────────────────────────────────────────
    MOMO_BASE_URL: z.string().url(),
    MOMO_SUBSCRIPTION_KEY: z.string().min(1),
    MOMO_API_USER: z.string().min(1),
    MOMO_API_KEY: z.string().min(1),
  },

  // ── Client-exposed vars ─────────────────────────────────────────────────────
  // Anything prefixed NEXT_PUBLIC_ is inlined into the client bundle at build
  // time — Next.js cannot read these dynamically, so every one must be listed
  // here AND mapped explicitly in experimental__runtimeEnv below.
  client: {
    NEXT_PUBLIC_STUDIO_URL: z.string().url(), // ← added
    NEXT_PUBLIC_INSTASKUL_URL: z.string().url(), // ← added
    NEXT_PUBLIC_MAXNOVATE_URL: z.string().url(), // ← added
    NEXT_PUBLIC_VENDLY_URL: z.string().url(), // ← added
  },

  // ── Runtime env mapping ──────────────────────────────────────────────────────
  // REQUIRED for every var in `client` — Next.js can't auto-bind these like it
  // can for server vars. This was previously an empty object, meaning none of
  // the NEXT_PUBLIC_* vars were actually validated or accessible client-side.
  experimental__runtimeEnv: {
    NEXT_PUBLIC_STUDIO_URL: process.env.NEXT_PUBLIC_STUDIO_URL,
    NEXT_PUBLIC_INSTASKUL_URL: process.env.NEXT_PUBLIC_INSTASKUL_URL,
    NEXT_PUBLIC_MAXNOVATE_URL: process.env.NEXT_PUBLIC_MAXNOVATE_URL,
    NEXT_PUBLIC_VENDLY_URL: process.env.NEXT_PUBLIC_VENDLY_URL,
  },

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
