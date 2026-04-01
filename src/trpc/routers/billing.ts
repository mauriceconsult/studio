/**
 * src/trpc/routers/billing.ts
 *
 * Dual-market billing router.
 * - International users  → Polar (card / Stripe checkout + meters)
 * - Ugandan users        → MoMo (MTN Mobile Money + local credit ledger)
 *
 * Polar product: "Studio Pro" — single product, three meters:
 *   POLAR_METER_TTS_GENERATION      → characters_synthesized
 *   POLAR_METER_VOICE_CREATION      → voices_cloned
 *   POLAR_METER_COURSE_GENERATION   → video_minutes
 *
 * Market is derived from Clerk publicMetadata.country set at signup.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { clerkClient } from "@clerk/nextjs/server";
import { polar } from "@/lib/polar";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { createTRPCRouter, orgProcedure } from "../init";
import {
  deriveMarket,
  OVERAGE_PRICES,
  type Market,
  type MeterEvent,
} from "@/lib/billing/market";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrgMarket(orgId: string): Promise<Market> {
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({
    organizationId: orgId,
  });
  const country = (org.publicMetadata?.country as string) ?? null;
  return deriveMarket(country);
}

// Maps internal MeterEvent names → Polar meter slugs from env
const POLAR_METER_MAP: Record<MeterEvent, string> = {
  characters_synthesized: env.POLAR_METER_TTS_GENERATION,
  voices_cloned: env.POLAR_METER_VOICE_CREATION,
  video_minutes: env.POLAR_METER_VIDEO_MINUTES,
};

interface PolarMeter {
  amount?: number | null;
}
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
  // Tells the client which payment rail this org uses so it renders
  // the correct billing UI without exposing server logic.

  getMarket: orgProcedure.query(async ({ ctx }) => {
    const market = await getOrgMarket(ctx.orgId);
    return { market };
  }),

  // ── getStatus ──────────────────────────────────────────────────────────────
  // Unified subscription + credit state across both markets.

  getStatus: orgProcedure.query(async ({ ctx }) => {
    const market = await getOrgMarket(ctx.orgId);

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

    // Global — Polar
    try {
      const state = await polar.customers.getStateExternal({
        externalId: ctx.orgId,
      });
      const activeSubs = (state.activeSubscriptions ?? []) as PolarActiveSub[];

      return {
        market: "global" as const,
        hasActiveSubscription: activeSubs.length > 0,
        plan: null, // single product — no tier distinction in Polar
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
  }),

  // ── createCheckout ─────────────────────────────────────────────────────────
  // Global only — initiates Polar hosted checkout for Studio Pro.

  createCheckout: orgProcedure.mutation(async ({ ctx }) => {
    const market = await getOrgMarket(ctx.orgId);

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
        message: "Failed to create checkout session",
      });
    }

    return { checkoutUrl: result.url };
  }),

  // ── createPortalSession ────────────────────────────────────────────────────
  // Global only — Polar customer portal for managing subscription and invoices.

  createPortalSession: orgProcedure.mutation(async ({ ctx }) => {
    const market = await getOrgMarket(ctx.orgId);

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
  }),

  // ── initiateMomoPlan ───────────────────────────────────────────────────────
  // UG only — kicks off MTN MoMo Request to Pay for a plan subscription.
  // Subscription is activated in DB by /api/webhooks/momo on SUCCESSFUL status.

  initiateMomoPlan: orgProcedure
    .input(
      z.object({
        plan: z.enum(["starter", "pro"]),
        phone: z.string().min(9).max(13),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const market = await getOrgMarket(ctx.orgId);

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
    }),

  // ── initiateMomoTopUp ──────────────────────────────────────────────────────
  // UG only — inline PAYG top-up when credits run out mid-generation.
  // Webhook credits the ledger and resumes the paused job on SUCCESSFUL.

  initiateMomoTopUp: orgProcedure
    .input(
      z.object({
        phone: z.string().min(9).max(13),
        meter: z.enum([
          "video_minutes",
          "characters_synthesized",
          "voices_cloned",
        ]),
        quantity: z.number().int().positive().max(500), // ✅ safety cap
        jobId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const market = await getOrgMarket(ctx.orgId);

      if (market !== "ug") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Top-up is for MoMo accounts only.",
        });
      }

      // ✅ FIXED: correct variable + full pricing logic
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

      return {
        referenceId,
        topUpId: topUp.id,
        totalUgx,
        unitPrice,
        meter: input.meter,
        quantity: input.quantity,
      };
    }),

  // ── ingestMeterEvent ───────────────────────────────────────────────────────
  // Fires a usage event after each billable action completes.
  // Global → reports to Polar via events.ingest using POLAR_METER_MAP slugs
  // UG     → deducts from MomoCredits ledger; signals needsTopUp to the worker

  ingestMeterEvent: orgProcedure
    .input(
      z.object({
        event: z.enum([
          "video_minutes",
          "characters_synthesized",
          "voices_cloned",
        ]),
        quantity: z.number().positive().max(500), // ✅ safety cap
        metadata: z.record(z.string(), z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const market = await getOrgMarket(ctx.orgId);

      // ✅ cost estimation (used for UI + limits)
      const price = OVERAGE_PRICES[input.event];
      const estimatedCostCents = price.usdCents * input.quantity;

      // 🔴 GLOBAL (Polar)
      if (market === "global") {
        await polar.events.ingest({
          events: [
            {
              name: POLAR_METER_MAP[input.event],
              externalCustomerId: ctx.orgId,
              metadata: {
                ...input.metadata,
                quantity: String(input.quantity),
                estimatedCostCents: String(estimatedCostCents),
              },
            },
          ],
        });

        return {
          creditsRemaining: null,
          needsTopUp: false,
          estimatedCostCents,
        };
      }

      // 🟢 UG (MoMo ledger)
      const credits = await prisma.momoCredits.findUnique({
        where: { orgId: ctx.orgId },
      });

      if (!credits) {
        return {
          creditsRemaining: 0,
          needsTopUp: true,
          estimatedCostCents,
        };
      }

      const fieldMap: Record<
        MeterEvent,
        "minutesRemaining" | "charsRemaining" | "voicesRemaining"
      > = {
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
    }),

  // ── getOveragePrices ───────────────────────────────────────────────────────
  // Returns per-unit PAYG prices for the client to display in top-up prompts.

  getOveragePrices: orgProcedure.query(async ({ ctx }) => {
    const market = await getOrgMarket(ctx.orgId);
    return { market, prices: OVERAGE_PRICES };
  }),
});
