import { createTRPCRouter } from "../init";
import { billingRouter } from "./billing";
import { generationsRouter } from "./generations";
import { voicesRouter } from "./voices";
import { coursesRouter } from "@/features/courses/courses-router";
import { videosRouter } from "@/features/videos/videos-router";
import { imageGenerationsRouter } from "./image-generations-router";
import { textGenerationsRouter } from "./text-generations-router";


export const appRouter = createTRPCRouter({
  // ── Studio core ─────────────────────────────────────────────────────────────
  voices:           voicesRouter,
  generations:      generationsRouter,      // TTS audio generation
  imageGenerations: imageGenerationsRouter, // Image generation (Zuriah covers, Instaskul thumbnails)
  textGenerations:  textGenerationsRouter,  // LLM text generation (standfirsts, headlines, scripts)
  billing:          billingRouter,

  // ── Instaskul ───────────────────────────────────────────────────────────────
  courses: coursesRouter,
  videos:  videosRouter,
});

export type AppRouter = typeof appRouter;
