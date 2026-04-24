// server/routers/image-generations.ts
// Add getAll to the router — it was missing, causing
// "Property 'getAll' does not exist" errors in the settings panel and toolbar.

import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { polar } from "@/lib/polar";
import { env } from "@/lib/env";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/db";
import { assertActiveSubscription } from "@/lib/subscription-guard";
import { createTRPCRouter, orgProcedure } from "../init";

const ALLOWED_STYLES = [
  "photojournalistic",
  "editorial",
  "documentary",
  "portrait",
] as const;

export type ImageStyle = (typeof ALLOWED_STYLES)[number];

const createImageSchema = z.object({
  prompt:         z.string().min(10).max(1000),
  style:          z.enum(ALLOWED_STYLES).default("photojournalistic"),
  width:          z.number().int().min(512).max(2048).default(1200),
  height:         z.number().int().min(512).max(2048).default(630),
  sourceApp:      z.string().default("zuriah"),
  sourceEntityId: z.string().optional(),
  platformUserId: z.string().optional(),
});

// Shared omit — never expose orgId to the client
const CLIENT_OMIT = { orgId: true } as const;

export const imageGenerationsRouter = createTRPCRouter({

  // ── getAll (was missing — needed by settings panel and toolbar invalidation) ─
  getAll: orgProcedure
    .input(z.object({ query: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return prisma.imageGeneration.findMany({
        where: {
          orgId: ctx.orgId,
          ...(input.query
            ? { prompt: { contains: input.query, mode: "insensitive" } }
            : {}),
        },
        orderBy: { createdAt: "desc" },
        omit: CLIENT_OMIT,
      });
    }),

  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const record = await prisma.imageGeneration.findUnique({
        where: { id: input.id, orgId: ctx.orgId },
        omit:  CLIENT_OMIT,
      });
      if (!record) throw new TRPCError({ code: "NOT_FOUND" });
      return record;
    }),

  getBySourceEntity: orgProcedure
    .input(z.object({
      sourceEntityId: z.string(),
      sourceApp:      z.string().default("zuriah"),
    }))
    .query(async ({ input, ctx }) => {
      return prisma.imageGeneration.findMany({
        where: {
          orgId:          ctx.orgId,
          sourceEntityId: input.sourceEntityId,
          sourceApp:      input.sourceApp,
          status:         "COMPLETED",
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        omit: CLIENT_OMIT,
      });
    }),

  create: orgProcedure
    .input(createImageSchema)
    .mutation(async ({ input, ctx }) => {
      // Single guard covering both Polar and MoMo users
      await assertActiveSubscription(ctx.orgId);

      const record = await prisma.imageGeneration.create({
        data: {
          orgId:          ctx.orgId,
          platformUserId: input.platformUserId ?? null,
          prompt:         input.prompt,
          style:          input.style,
          width:          input.width,
          height:         input.height,
          status:         "PENDING",
          sourceApp:      input.sourceApp,
          sourceEntityId: input.sourceEntityId ?? null,
        },
        select: { id: true },
      });

      Sentry.logger.info("Image generation started", {
        orgId: ctx.orgId,
        recordId: record.id,
        style: input.style,
      });

      try {
        await prisma.imageGeneration.update({
          where: { id: record.id },
          data:  { status: "PROCESSING" },
        });

        // TODO: call your image generation API here
        // const styledPrompt = buildStyledPrompt(input.prompt, input.style);
        // const result    = await imageClient.generate({ prompt: styledPrompt, ... });
        // const key       = `image-generations/orgs/${ctx.orgId}/${record.id}.jpg`;
        // await uploadImage({ buffer: result.buffer, key });
        // const outputUrl = `${env.R2_PUBLIC_URL}/${key}`;
        const outputUrl: string | null = null; // placeholder

        await prisma.imageGeneration.update({
          where: { id: record.id },
          data:  { status: "COMPLETED", outputUrl },
        });

        await prisma.usageRecord.create({
          data: {
            orgId:             ctx.orgId,
            imageGenerationId: record.id,
            imagesUsed:        1,
            month:             new Date().getMonth() + 1,
            year:              new Date().getFullYear(),
          },
        });

        Sentry.logger.info("Image generation completed", {
          orgId: ctx.orgId, recordId: record.id,
        });

      } catch (err) {
        await prisma.imageGeneration
          .update({
            where: { id: record.id },
            data:  {
              status:       "FAILED",
              errorMessage: err instanceof Error ? err.message : "Unknown error",
            },
          })
          .catch(() => {});

        Sentry.logger.error("Image generation failed", {
          orgId: ctx.orgId, recordId: record.id,
        });

        throw new TRPCError({
          code:    "INTERNAL_SERVER_ERROR",
          message: "Failed to generate image",
        });
      }

      polar.events
        .ingest({
          events: [{
            name:               env.POLAR_METER_IMAGE_GENERATION,
            externalCustomerId: ctx.orgId,
            metadata:           { imageGenerationId: record.id, style: input.style },
            timestamp:          new Date(),
          }],
        })
        .catch(() => {});

      return { id: record.id };
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.imageGeneration.delete({
        where: { id: input.id, orgId: ctx.orgId },
      });
    }),
});

// ─── Prompt styling helper (exported for jobs.ts) ─────────────────────────────

export function buildStyledPrompt(prompt: string, style: ImageStyle): string {
  const modifiers: Record<ImageStyle, string> = {
    photojournalistic: "Documentary photography, natural light, candid, high contrast, photojournalistic.",
    editorial:         "Editorial photography, studio lighting, composed, magazine quality.",
    documentary:       "Long-form documentary photography, environmental context, authentic moment.",
    portrait:          "Portrait photography, shallow depth of field, subject-focused.",
  };
  return `${prompt} ${modifiers[style]}`;
}
