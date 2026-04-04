import { z } from "zod";
import { createTRPCRouter, orgProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { prisma } from "@/lib/db";

export const videosRouter = createTRPCRouter({
  getAll: orgProcedure
    .input(z.object({ query: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return prisma.video.findMany({
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
      const video = await prisma.video.findFirst({
        where: { id: input.id, organizationId: ctx.orgId },
      });
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });
      return video;
    }),

  create: orgProcedure
    .input(z.object({ title: z.string().min(1), script: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return prisma.video.create({
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
        outputUrl: z.string().url().optional(),
        externalJobId: z.string().optional(),
        errorMessage: z.string().optional(),
        durationSeconds: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return prisma.video.update({
        where: { id, organizationId: ctx.orgId },
        data,
      });
    }),

  delete: orgProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await prisma.video.delete({
        where: { id: input.id, organizationId: ctx.orgId },
      });
    }),
});
