/**
 * src/features/videos/videos-router.ts
 *
 * Client-callable tRPC procedures for video management.
 * NOTE: updateStatus is intentionally absent — status transitions are
 * written exclusively by the generation worker via /api/webhooks/video,
 * not by the browser client.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, orgProcedure } from "@/trpc/init";
import { prisma } from "@/lib/db";

// Shared field allowlist — keeps internal columns off the wire consistently
// across getAll and getById without duplicating the select object.
const VIDEO_SELECT = {
  id: true,
  title: true,
  status: true,
  progress: true,
  outputUrl: true,
  durationSeconds: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const videosRouter = createTRPCRouter({
  // ── getAll ─────────────────────────────────────────────────────────────────
  // Returns all videos for the org, newest first.
  // `query` is an optional case-insensitive title filter.

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
        select: VIDEO_SELECT,
        orderBy: { createdAt: "desc" },
      });
    }),

  // ── getById ────────────────────────────────────────────────────────────────
  // Fetches a single video. findUnique is correct for a PK lookup and is
  // more efficient than findFirst (no implicit LIMIT 1 scan).

  getById: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const video = await prisma.video.findUnique({
        where: { id: input.id, organizationId: ctx.orgId },
        select: VIDEO_SELECT,
      });

      if (!video) throw new TRPCError({ code: "NOT_FOUND" });

      return video;
    }),

  // ── create ─────────────────────────────────────────────────────────────────
  // Creates a video record in `pending` state. The generation worker picks
  // it up and drives all subsequent status transitions independently.

  create: orgProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        script: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return prisma.video.create({
        data: {
          userId: ctx.userId,
          organizationId: ctx.orgId,
          title: input.title,
          script: input.script,
          status: "pending",
        },
        select: VIDEO_SELECT,
      });
    }),

  // ── delete ─────────────────────────────────────────────────────────────────
  // Permanently removes a video. Ownership is enforced in the where clause —
  // Prisma throws P2025 if the record is missing or belongs to another org,
  // which we surface as NOT_FOUND rather than leaking record existence.
  // TODO: trigger R2 asset cleanup for outputUrl / thumbnail after deletion.

  delete: orgProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await prisma.video.delete({
          where: { id: input.id, organizationId: ctx.orgId },
        });
      } catch {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return { deleted: true, id: input.id };
    }),
});
