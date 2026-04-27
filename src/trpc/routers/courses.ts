import { z } from "zod";
import { createTRPCRouter, orgProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/db";
import type { InputJsonValue } from "@prisma/client/runtime/client";

export const coursesRouter = createTRPCRouter({
  getAll: orgProcedure
    .input(z.object({ query: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return prisma.course.findMany({
        where: {
          organizationId: ctx.orgId,
          ...(input.query
            ? { title: { contains: input.query, mode: "insensitive" } }
            : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: orgProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const course = await prisma.course.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
      });
      if (!course) throw new TRPCError({ code: "NOT_FOUND" });
      return course;
    }),

  create: orgProcedure
    .input(z.object({ title: z.string().min(1), script: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return prisma.course.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.orgId,
          title: input.title,
          script: input.script,
          status: "pending",
        },
      });
    }),

  updateStatus: orgProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["pending", "processing", "done", "error"]),
        progress: z.number().min(0).max(100).optional(),
        result: z.record(z.string(), z.unknown()).optional(),
        externalJobId: z.string().optional(),
        errorMessage: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, result, ...rest } = input;
      return prisma.course.update({
        where: { id, organizationId: ctx.orgId },
        data: {
          ...rest,
          ...(result !== undefined
            ? { result: result as InputJsonValue }
            : {}),
        },
      });
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.course.delete({
        where: { id: input.id, organizationId: ctx.orgId },
      });
    }),
});
