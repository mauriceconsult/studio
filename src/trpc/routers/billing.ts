/**
 * server/routers/billing.ts
 *
 * Dual-market billing router.
 * - International users  → Polar (card / Stripe checkout + meters)
 * - Ugandan users        → MoMo (MTN Mobile Money + local credit ledger)
 *
 * Market is derived from Clerk publicMetadata.country set at signup.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { clerkClient } from "@clerk/nextjs/server";
import { polar } from "@/lib/polar";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { createTRPCRouter, orgProcedure } from "../init";
import {
  deriveMarket,
  OVERAGE_PRICES,
  PLAN_INCLUDED,
  type Market,
  type MeterEvent,
  type PlanId,
} from "@/lib/billing/market";

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOrgMarket(orgId: string): Promise<Market> {
  // Clerk org metadata: publicMetadata.country set at signup
  const org = await clerkClient.organizations.getOrganization({ organizationId: orgId });
  const country = (org.publicMetadata?.country as string) ?? null;
  return deriveMarket(country);
}

const POLAR_PRODUCT_IDS: Record<PlanId, string> = {
  starter: env.POLAR_STARTER_PRODUCT_ID,
  pro:     env.POLAR_PRO_PRODUCT_ID,
};

function aggregatePolarMeters(activeSubscriptions: any[]): number {
  let cents = 0;
  for (const sub of activeSubscriptions ?? []) {
    for (const meter of sub.meters ?? []) {
      cents += meter.amount ?? 0;
    }
  }
  return cents;
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const billingRouter = createTRPCRouter({

  // ── getMarket ──────────────────────────────────────────────────────────────
  // Let the client know which payment rail this org uses.

  getMarket: orgProcedure.query(async ({ ctx }) => {
    const market = await getOrgMarket(ctx.orgId);
    return { market };
  }),

  // ── getStatus ──────────────────────────────────────────────────────────────
  // Unified subscription status across both markets.

  getStatus: orgProcedure.query(async ({ ctx }) => {
    const market = await getOrgMarket(ctx.orgId);

    if (market === "ug") {
      const sub = await db.momoSubscription.findFirst({
        where: { orgId: ctx.orgId, status: "active" },
        include: { credits: true },
      });

      return {
        market: "ug" as const,
        hasActiveSubscription: !!sub && new Date(sub.expiresAt) > new Date(),
        plan: sub?.plan ?? null,
        credits: sub?.credits ?? null,
        estimatedCostCents: null, // not applicable for MoMo flat plans
        customerId: null,
      };
    }

    // Global — Polar
    try {
      const customerState = await polar.customers.getStateExternal({
        externalId: ctx.orgId,
      });

      const activeSubs = customerState.activeSubscriptions ?? [];
      const hasActiveSubscription = activeSubs.length > 0;
      const plan = (activeSubs[0]?.product?.name?.toLowerCase() ?? null) as PlanId | null;

      return {
        market: "global" as const,
        hasActiveSubscription,
        plan,
        credits: null, // Polar manages this natively
        estimatedCostCents: aggregatePolarMeters(activeSubs),
        customerId: customerState.id,
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
  // Global only — initiates Polar hosted checkout.

  createCheckout: orgProcedure
    .input(z.object({ plan: z.enum(["starter", "pro"]) }))
    .mutation(async ({ ctx, input }) => {
      const market = await getOrgMarket(ctx.orgId);

      if (market === "ug") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ugandan accounts use MoMo. Use initiateMomoPlan instead.",
        });
      }

      const result = await polar.checkouts.create({
        products: [POLAR_PRODUCT_IDS[input.plan]],
        externalCustomerId: ctx.orgId,
        successUrl: `${env.APP_URL}/billing/success?session={CHECKOUT_SESSION_ID}&plan=${input.plan}`,
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
  // Global only — Polar customer portal for managing subscription.

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
  // Actual payment confirmation is handled by the /api/webhooks/momo route,
  // which activates the subscription in DB on SUCCESSFUL status.

  initiateMomoPlan: orgProcedure
    .input(z.object({
      plan:  z.enum(["starter", "pro"]),
      phone: z.string().min(9).max(13),
    }))
    .mutation(async ({ ctx, input }) => {
      const market = await getOrgMarket(ctx.orgId);

      if (market !== "ug") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "International accounts use card checkout.",
        });
      }

      const res = await fetch(`${env.APP_URL}/api/momo-pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId: ctx.orgId,
          phone: input.phone,
          plan:  input.plan,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error ?? "MoMo payment initiation failed",
        });
      }

      const { referenceId } = await res.json();
      return { referenceId };
    }),

  // ── initiateMomoTopUp ──────────────────────────────────────────────────────
  // UG only — inline PAYG top-up when a user runs out of credits mid-generation.
  // After successful MoMo payment, the webhook credits the ledger and
  // resumes the paused job (if jobId is provided).

  initiateMomoTopUp: orgProcedure
    .input(z.object({
      phone:    z.string().min(9).max(13),
      meter:    z.enum(["videos_generated", "characters_synthesized", "voices_cloned"]),
      quantity: z.number().int().positive(),
      jobId:    z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const market = await getOrgMarket(ctx.orgId);

      if (market !== "ug") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Top-up is for MoMo accounts only." });
      }

      const unitPrice = OVERAGE_PRICES[input.meter].ugx;
      const totalUgx  = unitPrice * input.quantity;

      // Record top-up request before initiating payment
      const topUp = await db.momoTopUp.create({
        data: {
          orgId:      ctx.orgId,
          phone:      input.phone,
          amountUgx:  totalUgx,
          meter:      input.meter,
          quantity:   input.quantity,
          jobId:      input.jobId,
          status:     "pending",
        },
      });

      const res = await fetch(`${env.APP_URL}/api/momo-pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgId:     ctx.orgId,
          phone:     input.phone,
          amountUgx: totalUgx,
          topUpId:   topUp.id,   // webhook uses this to credit the right ledger
        }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error ?? "MoMo top-up initiation failed",
        });
      }

      const { referenceId } = await res.json();

      await db.momoTopUp.update({
        where: { id: topUp.id },
        data:  { referenceId },
      });

      return {
        referenceId,
        topUpId:   topUp.id,
        totalUgx,
        unitPrice,
        meter:     input.meter,
        quantity:  input.quantity,
      };
    }),

  // ── ingestMeterEvent ───────────────────────────────────────────────────────
  // Fires a usage meter event.
  // - Global: reports to Polar
  // - UG: deducts from local MomoCredits ledger; returns whether credits remain
  //   so the caller (worker) knows whether to pause and prompt top-up.

  ingestMeterEvent: orgProcedure
    .input(z.object({
      event:    z.enum(["videos_generated", "characters_synthesized", "voices_cloned"]),
      quantity: z.number().positive(),
      metadata: z.record(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const market = await getOrgMarket(ctx.orgId);

      if (market === "global") {
        await polar.ingestion.ingest({
          events: [{
            name:               input.event,
            externalCustomerId: ctx.orgId,
            metadata:           input.metadata,
          }],
        });
        return { creditsRemaining: null, needsTopUp: false };
      }

      // UG — deduct from local ledger
      const credits = await db.momoCredits.findUnique({
        where: { orgId: ctx.orgId },
      });

      if (!credits) {
        return { creditsRemaining: 0, needsTopUp: true };
      }

      const fieldMap: Record<MeterEvent, keyof typeof credits> = {
        videos_generated:       "videosRemaining",
        characters_synthesized: "charsRemaining",
        voices_cloned:          "voicesRemaining",
      };

      const field = fieldMap[input.event];
      const current = credits[field] as number;
      const needsTopUp = current < input.quantity;

      if (!needsTopUp) {
        await db.momoCredits.update({
          where: { orgId: ctx.orgId },
          data:  { [field]: { decrement: input.quantity } },
        });
      }

      return {
        creditsRemaining: Math.max(0, current - input.quantity),
        needsTopUp,
        meter: input.event,
        shortfall: needsTopUp ? input.quantity - current : 0,
      };
    }),

  // ── getOveragePrices ───────────────────────────────────────────────────────
  // Returns PAYG unit prices for the client to display in top-up prompts.

  getOveragePrices: orgProcedure.query(async ({ ctx }) => {
    const market = await getOrgMarket(ctx.orgId);
    return { market, prices: OVERAGE_PRICES };
  }),

});
