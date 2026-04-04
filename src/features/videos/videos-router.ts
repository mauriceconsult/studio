import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

export const videosRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(z.object({ query: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.video.findMany({
        where: {
          organizationId: ctx.auth.orgId!,
          ...(input.query
            ? { title: { contains: input.query, mode: "insensitive" } }
            : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const video = await ctx.db.video.findFirst({
        where: { id: input.id, organizationId: ctx.auth.orgId! },
      });
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });
      return video;
    }),

  create: protectedProcedure
    .input(z.object({ title: z.string().min(1), script: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.video.create({
        data: {
          userId: ctx.auth.userId!,
          organizationId: ctx.auth.orgId!,
          title: input.title,
          script: input.script,
          status: "pending",
        },
      });
    }),

  updateStatus: protectedProcedure
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
      return ctx.db.video.update({
        where: { id, organizationId: ctx.auth.orgId! },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.video.delete({
        where: { id: input.id, organizationId: ctx.auth.orgId! },
      });
    }),
});
