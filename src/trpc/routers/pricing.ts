import { z } from "zod";
import { createTRPCRouter, orgProcedure } from "@/trpc/init";
import { env } from "@/lib/env";
import { pricingRailForOrg } from "@/lib/pricing/rail";
import {
  quoteClip,
  quoteImage,
  quoteSong,
  toPublicQuote,
} from "@/lib/pricing/quote";

export const pricingRouter = createTRPCRouter({
  quoteSong: orgProcedure
    .input(
      z.object({
        seconds: z.number().int().min(10).max(600),
        thinking: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) =>
      toPublicQuote(
        quoteSong(input.seconds, await pricingRailForOrg(ctx.orgId), input.thinking),
      ),
    ),
  quoteImage: orgProcedure
    .input(
      z.object({
        count: z.number().int().min(1).max(100).default(1),
        width: z.number().int().positive().max(4096).default(1920),
        height: z.number().int().positive().max(4096).default(1080),
      }),
    )
    .query(async ({ ctx, input }) =>
      toPublicQuote(
        quoteImage(
          input.count,
          await pricingRailForOrg(ctx.orgId),
          input.width,
          input.height,
        ),
      ),
    ),
  quoteClip: orgProcedure
    .input(
      z.object({
        seconds: z.number().int().min(3).max(10),
        resolution: z.enum(["480p", "580p", "720p"]).default(env.CLIP_FAL_RESOLUTION),
      }),
    )
    .query(async ({ ctx, input }) =>
      toPublicQuote(
        quoteClip(
          input.seconds,
          input.resolution,
          await pricingRailForOrg(ctx.orgId),
        ),
      ),
    ),
});
