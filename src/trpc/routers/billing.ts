/**
 * src/trpc/routers/billing.ts
 *
 * KEY CHANGES vs previous version:
 * 1. Every procedure calls assertMarketResolved() — never silently defaults
 *    to "global" when country is missing on the org.
 * 2. MarketUnresolvedError → PRECONDITION_FAILED so client can show
 *    onboarding prompt instead of a generic crash.
 * 3. New setMarket procedure writes country → Clerk org metadata.
 *    This is the one place that fixes "unresolved" orgs.
 * 4. Removed stray top-level await clerkClient.organizations.update that
 *    was executing on module load.
 * 5. getMarket now returns MarketOrUnresolved — client must handle it.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { clerkClient } from "@clerk/nextjs/server";
import type { ClerkClient } from "@clerk/backend";
import { polar } from "@/lib/polar";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createTRPCRouter, orgProcedure } from "../init";
import {
  deriveMarket,
  assertMarketResolved,
  MarketUnresolvedError,
  OVERAGE_PRICES,
  type MeterEvent,
  type MarketOrUnresolved,
} from "@/lib/billing/market";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrgMarket(orgId: string): Promise<MarketOrUnresolved> {
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({
    organizationId: orgId,
  });
  const country = (org.publicMetadata?.country as string) ?? null;
  return deriveMarket(country); // returns "unresolved" when null
}

function toTRPC(err: unknown): TRPCError {
  if (err instanceof MarketUnresolvedError) {
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Your account region hasn't been configured yet. " +
        "Please complete onboarding or contact support.",
      cause: err,
    });
  }
  if (err instanceof TRPCError) return err;
  return new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: err instanceof Error ? err.message : "Unexpected billing error",
    cause: err,
  });
}

const POLAR_METER_MAP: Record<MeterEvent, string> = {
  characters_synthesized: env.POLAR_METER_TTS_GENERATION,
  voices_cloned: env.POLAR_METER_VOICE_CREATION,
  video_minutes: env.POLAR_METER_VIDEO_MINUTES,
};

interface PolarMeter { amount?: number | null }
interface PolarActiveSub {
  productId?: string | null;
  meters?: PolarMeter[] | null;
}

function aggregatePolarMeters(subs: PolarActiveSub[]): number {
  let cents = 0;
  for (const sub of subs)
    for (const meter of sub.meters ?? []) cents += meter.amount ?? 0;
  return cents;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const billingRouter = createTRPCRouter({
  // ── getMarket ──────────────────────────────────────────────────────────────
  // Returns market | "unresolved". Client should redirect to onboarding
  // when "unresolved" rather than assuming global.

  getMarket: orgProcedure.query(async ({ ctx }) => {
    const market = await getOrgMarket(ctx.orgId);
    return { market }; // MarketOrUnresolved
  }),

  // ── setMarket ──────────────────────────────────────────────────────────────
  // Called from onboarding flow to write country → Clerk org publicMetadata.
  // This is the single place that resolves an "unresolved" org.

  setMarket: orgProcedure
    .input(
      z.object({
        country: z
          .string()
          .min(2)
          .max(2)
          .transform((c) => c.toUpperCase()),
      }),
    )
.mutation(async ({ ctx, input }) => {
  const client = (await clerkClient()) as ClerkClient;

await client.organizations.updateOrganization(
  ctx.orgId,
  {
    publicMetadata: {
      country: input.country,
    },
  }
);

  const market = deriveMarket(input.country);
  return { market };
}),

  // ── getStatus ──────────────────────────────────────────────────────────────

  getStatus: orgProcedure.query(async ({ ctx }) => {
    try {
      const market = await getOrgMarket(ctx.orgId);
      assertMarketResolved(market, ctx.orgId);

      if (market === "ug") {
        const sub = await prisma.momoSubscription.findFirst({
          where: { orgId: ctx.orgId, status: "active" },
          include: { credits: true },
        });
        return {
          market: "ug" as const,
          hasActiveSubscription: !!sub && new Date(sub.expiresAt) > new Date(),
          plan: sub?.plan ?? null,
          credits: sub?.credits ?? null,
          estimatedCostCents: null,
          customerId: null,
        };
      }

      try {
        const state = await polar.customers.getStateExternal({
          externalId: ctx.orgId,
        });
        const activeSubs = (state.activeSubscriptions ?? []) as PolarActiveSub[];
        return {
          market: "global" as const,
          hasActiveSubscription: activeSubs.length > 0,
          plan: null,
          credits: null,
          estimatedCostCents: aggregatePolarMeters(activeSubs),
          customerId: state.id,
        };
      } catch {
        return {
          market: "global" as const,
          hasActiveSubscription: false,
          plan: null,
          credits: null,
          estimatedCostCents: 0,
          customerId: null,
        };
      }
    } catch (err) {
      throw toTRPC(err);
    }
  }),

  // ── createCheckout ─────────────────────────────────────────────────────────

  createCheckout: orgProcedure.mutation(async ({ ctx }) => {
    try {
      const market = await getOrgMarket(ctx.orgId);
      assertMarketResolved(market, ctx.orgId);

      if (market === "ug") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ugandan accounts use MoMo. Use initiateMomoPlan instead.",
        });
      }

      const result = await polar.checkouts.create({
        products: [env.POLAR_PRODUCT_ID],
        externalCustomerId: ctx.orgId,
        successUrl: `${env.APP_URL}/billing/success?session={CHECKOUT_SESSION_ID}`,
      });

      if (!result.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Polar returned a checkout with no URL",
        });
      }

      return { checkoutUrl: result.url };
    } catch (err) {
      throw toTRPC(err);
    }
  }),

  // ── createPortalSession ────────────────────────────────────────────────────

  createPortalSession: orgProcedure.mutation(async ({ ctx }) => {
    try {
      const market = await getOrgMarket(ctx.orgId);
      assertMarketResolved(market, ctx.orgId);

      if (market === "ug") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "MoMo accounts manage billing via the in-app billing page.",
        });
      }

      const result = await polar.customerSessions.create({
        externalCustomerId: ctx.orgId,
      });

      if (!result.customerPortalUrl) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create customer portal session",
        });
      }

      return { portalUrl: result.customerPortalUrl };
    } catch (err) {
      throw toTRPC(err);
    }
  }),

  // ── initiateMomoPlan ───────────────────────────────────────────────────────

  initiateMomoPlan: orgProcedure
    .input(
      z.object({
        plan: z.enum(["starter", "pro"]),
        phone: z.string().min(9).max(13),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const market = await getOrgMarket(ctx.orgId);
        assertMarketResolved(market, ctx.orgId);

        if (market !== "ug") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "International accounts use card checkout.",
          });
        }

        const res = await fetch(`${env.PLATFORM_API_URL}/api/momo-pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId: ctx.orgId,
            phone: input.phone,
            plan: input.plan,
          }),
        });

        if (!res.ok) {
          const { error } = (await res.json()) as { error?: string };
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error ?? "MoMo payment initiation failed",
          });
        }

        const { referenceId } = (await res.json()) as { referenceId: string };
        return { referenceId };
      } catch (err) {
        throw toTRPC(err);
      }
    }),

  // ── initiateMomoTopUp ──────────────────────────────────────────────────────

  initiateMomoTopUp: orgProcedure
    .input(
      z.object({
        phone: z.string().min(9).max(13),
        meter: z.enum(["video_minutes", "characters_synthesized", "voices_cloned"]),
        quantity: z.number().int().positive().max(500),
        jobId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const market = await getOrgMarket(ctx.orgId);
        assertMarketResolved(market, ctx.orgId);

        if (market !== "ug") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Top-up is for MoMo accounts only.",
          });
        }

        const price = OVERAGE_PRICES[input.meter];
        const unitPrice = price.ugx;
        const totalUgx = unitPrice * input.quantity;

        const topUp = await prisma.momoTopUp.create({
          data: {
            orgId: ctx.orgId,
            phone: input.phone,
            amountUgx: totalUgx,
            meter: input.meter,
            quantity: input.quantity,
            jobId: input.jobId,
            status: "pending",
          },
        });

        const res = await fetch(`${env.PLATFORM_API_URL}/api/momo-pay`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orgId: ctx.orgId,
            phone: input.phone,
            amountUgx: totalUgx,
            topUpId: topUp.id,
          }),
        });

        if (!res.ok) {
          const { error } = (await res.json()) as { error?: string };
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error ?? "MoMo top-up initiation failed",
          });
        }

        const { referenceId } = (await res.json()) as { referenceId: string };

        await prisma.momoTopUp.update({
          where: { id: topUp.id },
          data: { referenceId },
        });

        return { referenceId, topUpId: topUp.id, totalUgx, unitPrice, meter: input.meter, quantity: input.quantity };
      } catch (err) {
        throw toTRPC(err);
      }
    }),

  // ── ingestMeterEvent ───────────────────────────────────────────────────────

  ingestMeterEvent: orgProcedure
    .input(
      z.object({
        event: z.enum(["video_minutes", "characters_synthesized", "voices_cloned"]),
        quantity: z.number().positive().max(500),
        metadata: z.record(z.string(), z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const market = await getOrgMarket(ctx.orgId);
        assertMarketResolved(market, ctx.orgId);

        const price = OVERAGE_PRICES[input.event];
        const estimatedCostCents = price.usdCents * input.quantity;

        if (market === "global") {
          await polar.events.ingest({
            events: [
              {
                name: POLAR_METER_MAP[input.event],
                externalCustomerId: ctx.orgId,
                metadata: {
                  ...input.metadata,
                  value: String(input.quantity),
                },
              },
            ],
          });
          return { creditsRemaining: null, needsTopUp: false, estimatedCostCents };
        }

        const credits = await prisma.momoCredits.findUnique({
          where: { orgId: ctx.orgId },
        });

        if (!credits) {
          return { creditsRemaining: 0, needsTopUp: true, estimatedCostCents };
        }

        const fieldMap: Record<MeterEvent, "minutesRemaining" | "charsRemaining" | "voicesRemaining"> = {
          video_minutes: "minutesRemaining",
          characters_synthesized: "charsRemaining",
          voices_cloned: "voicesRemaining",
        };

        const field = fieldMap[input.event];
        const current = credits[field];
        const needsTopUp = current < input.quantity;

        if (!needsTopUp) {
          await prisma.momoCredits.update({
            where: { orgId: ctx.orgId },
            data: { [field]: { decrement: input.quantity } },
          });
        }

        return {
          creditsRemaining: Math.max(0, current - input.quantity),
          needsTopUp,
          meter: input.event,
          shortfall: needsTopUp ? input.quantity - current : 0,
          estimatedCostCents,
        };
      } catch (err) {
        throw toTRPC(err);
      }
    }),

  // ── getOveragePrices ───────────────────────────────────────────────────────

  getOveragePrices: orgProcedure.query(async ({ ctx }) => {
    try {
      const market = await getOrgMarket(ctx.orgId);
      assertMarketResolved(market, ctx.orgId);
      return { market, prices: OVERAGE_PRICES };
    } catch (err) {
      throw toTRPC(err);
    }
  }),
});
