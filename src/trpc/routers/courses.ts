import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/db";
import { deleteAudio } from "@/lib/r2";
import { createTRPCRouter, orgProcedure } from "../init";

// ← shared select to avoid duplication
const courseSelect = {
  id: true,
  name: true,
  description: true,
  category: true,
  language: true,
  variant: true,
} as const;

export const coursesRouter = createTRPCRouter({
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
        prisma.course.findMany({
          where: {
            variant: "CUSTOM",
            orgId: ctx.orgId,
            deletedAt: null, // ← soft delete filter
            ...searchFilter,
          },
          orderBy: { createdAt: "desc" },
          select: courseSelect,
        }),
        prisma.course.findMany({
          where: {
            variant: "SYSTEM",
            deletedAt: null, // ← soft delete filter
            ...searchFilter,
          },
          orderBy: { name: "asc" },
          select: courseSelect,
        }),
      ]);

      return { custom, system };
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const course = await prisma.course.findUnique({
        where: {
          id: input.id,
          variant: "CUSTOM",
          orgId: ctx.orgId,
          deletedAt: null, // ← only delete active courses
        },
        select: { id: true, r2ObjectKey: true },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "course not found",
        });
      }

      // Soft delete — preserves generation history integrity
      await prisma.course.update({
        where: { id: course.id },
        data: { deletedAt: new Date() },
      });

      // Clean up R2 storage — background job candidate for production
      if (course.r2ObjectKey) {
        await deleteAudio(course.r2ObjectKey).catch((err) => {
          console.error("[R2_DELETE_FAILED]", {
            courseId: course.id,
            key: course.r2ObjectKey,
            error: err,
          });
        });
      }

      return { success: true };
    }),
});
