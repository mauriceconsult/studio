import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/db";
import { deleteAudio } from "@/lib/r2";
import { createTRPCRouter, orgProcedure } from "../init";

// ← shared select to avoid duplication
const voiceSelect = {
  id: true,
  name: true,
  description: true,
  category: true,
  language: true,
  variant: true,
} as const;

export const voicesRouter = createTRPCRouter({
  getAll: orgProcedure
    .input(
      z
        .object({
          query: z.string().trim().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const searchFilter = input?.query
        ? {
            OR: [
              { name: { contains: input.query, mode: "insensitive" as const } },
              {
                description: {
                  contains: input.query,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {};

      const [custom, system] = await Promise.all([
        prisma.voice.findMany({
          where: {
            variant: "CUSTOM",
            orgId: ctx.orgId,
            deletedAt: null, // ← soft delete filter
            ...searchFilter,
          },
          orderBy: { createdAt: "desc" },
          select: voiceSelect,
        }),
        prisma.voice.findMany({
          where: {
            variant: "SYSTEM",
            deletedAt: null, // ← soft delete filter
            ...searchFilter,
          },
          orderBy: { name: "asc" },
          select: voiceSelect,
        }),
      ]);

      return { custom, system };
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const voice = await prisma.voice.findUnique({
        where: {
          id: input.id,
          variant: "CUSTOM",
          orgId: ctx.orgId,
          deletedAt: null, // ← only delete active voices
        },
        select: { id: true, r2ObjectKey: true },
      });

      if (!voice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voice not found",
        });
      }

      // Soft delete — preserves generation history integrity
      await prisma.voice.update({
        where: { id: voice.id },
        data: { deletedAt: new Date() },
      });

      // Clean up R2 storage — background job candidate for production
      if (voice.r2ObjectKey) {
        await deleteAudio(voice.r2ObjectKey).catch((err) => {
          console.error("[R2_DELETE_FAILED]", {
            voiceId: voice.id,
            key: voice.r2ObjectKey,
            error: err,
          });
        });
      }

      return { success: true };
    }),
});
