import * as Sentry from "@sentry/nextjs";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { ai } from "@/lib/ai";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";
import { polar } from "@/lib/polar";
import { assertActiveSubscription } from "@/lib/subscription-guard";
import { createTRPCRouter, orgProcedure } from "@/trpc/init";

const createLyricsSchema = z.object({
  prompt: z.string().trim().min(10).max(2000),
  genre: z.string().trim().max(80).optional(),
  mood: z.string().trim().max(80).optional(),
  language: z.string().trim().min(2).max(40).default("English"),
  tempoBpm: z.number().int().min(40).max(240).optional(),
  targetDurationSeconds: z.number().int().min(30).max(600).optional(),
  sourceApp: z.string().trim().min(1).max(80).default("studio"),
  sourceEntityId: z.string().max(200).optional(),
  platformUserId: z.string().max(200).optional(),
});

const CLIENT_OMIT = { orgId: true } as const;

function buildLyricsPrompt(input: z.infer<typeof createLyricsSchema>): string {
  const details = [
    `Language: ${input.language}`,
    input.genre ? `Genre: ${input.genre}` : null,
    input.mood ? `Mood: ${input.mood}` : null,
    input.tempoBpm ? `Target tempo: ${input.tempoBpm} BPM` : null,
    input.targetDurationSeconds
      ? `Target duration: ${input.targetDurationSeconds} seconds`
      : null,
  ].filter((detail): detail is string => detail !== null);

  return `Write original song lyrics from this brief:\n${input.prompt}\n\n${details.join("\n")}`;
}

export const lyricsRouter = createTRPCRouter({
  getAll: orgProcedure.query(async ({ ctx }) => {
    return prisma.lyricsGeneration.findMany({
      where: { orgId: ctx.orgId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
      omit: CLIENT_OMIT,
    });
  }),

  getById: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      const generation = await prisma.lyricsGeneration.findFirst({
        where: { id: input.id, orgId: ctx.orgId, deletedAt: null },
        omit: CLIENT_OMIT,
      });
      if (!generation) throw new TRPCError({ code: "NOT_FOUND" });
      return generation;
    }),

  getBySourceEntity: orgProcedure
    .input(
      z.object({
        sourceEntityId: z.string().min(1),
        sourceApp: z.string().min(1).optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      return prisma.lyricsGeneration.findMany({
        where: {
          orgId: ctx.orgId,
          sourceEntityId: input.sourceEntityId,
          deletedAt: null,
          ...(input.sourceApp ? { sourceApp: input.sourceApp } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        omit: CLIENT_OMIT,
      });
    }),

  create: orgProcedure
    .input(createLyricsSchema)
    .mutation(async ({ input, ctx }) => {
      await assertActiveSubscription(ctx.orgId);

      const record = await prisma.lyricsGeneration.create({
        data: {
          orgId: ctx.orgId,
          platformUserId: input.platformUserId ?? null,
          prompt: input.prompt,
          genre: input.genre || null,
          mood: input.mood || null,
          language: input.language,
          targetTempoBpm: input.tempoBpm ?? null,
          targetDurationMs: input.targetDurationSeconds
            ? input.targetDurationSeconds * 1000
            : null,
          sourceApp: input.sourceApp,
          sourceEntityId: input.sourceEntityId ?? null,
          status: "PENDING",
        },
        select: { id: true },
      });

      Sentry.logger.info("Lyrics generation started", {
        orgId: ctx.orgId,
        recordId: record.id,
      });

      try {
        await prisma.lyricsGeneration.update({
          where: { id: record.id },
          data: { status: "PROCESSING" },
        });

        const result = await ai.generateText({
          type: "lyrics",
          prompt: buildLyricsPrompt(input),
        });
        const lyrics = result.output.trim();
        if (!lyrics) {
          throw new Error("The lyrics provider returned an empty response");
        }

        await prisma.$transaction(async (transaction) => {
          await transaction.lyricsGeneration.update({
            where: { id: record.id },
            data: { status: "COMPLETED", lyrics },
          });
          await transaction.usageRecord.create({
            data: {
              orgId: ctx.orgId,
              lyricsGenerationId: record.id,
              lyricsUsed: 1,
              month: new Date().getMonth() + 1,
              year: new Date().getFullYear(),
            },
          });
        });

        Sentry.logger.info("Lyrics generation completed", {
          orgId: ctx.orgId,
          recordId: record.id,
          provider: result.provider,
          model: result.model,
        });

        try {
          await polar.events.ingest({
            events: [
              {
                name: env.POLAR_METER_TEXT_GENERATION,
                externalCustomerId: ctx.orgId,
                metadata: {
                  lyricsGenerationId: record.id,
                  type: "lyrics",
                  tokensUsed: String(result.totalTokens),
                },
                timestamp: new Date(),
              },
            ],
          });
        } catch (error) {
          Sentry.logger.error("Lyrics generation metering failed", {
            orgId: ctx.orgId,
            recordId: record.id,
            error: error instanceof Error ? error.message : String(error),
          });
        }

        return { id: record.id, lyrics };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown generation error";

        try {
          await prisma.lyricsGeneration.update({
            where: { id: record.id },
            data: { status: "FAILED", errorMessage },
          });
        } catch (updateError) {
          Sentry.logger.error("Failed to mark lyrics generation as failed", {
            orgId: ctx.orgId,
            recordId: record.id,
            error:
              updateError instanceof Error
                ? updateError.message
                : String(updateError),
          });
        }

        Sentry.logger.error("Lyrics generation failed", {
          orgId: ctx.orgId,
          recordId: record.id,
          error: errorMessage,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate lyrics",
        });
      }
    }),
});
