/**
 * lib/subscription-guard.ts
 *
 * Single subscription check used by every generation router.
 * Checks Polar first (international / card users), then falls back to
 * MomoSubscription (MTN MoMo / Ugandan users).
 *
 * Throws TRPCError FORBIDDEN if neither source has an active subscription.
 *
 * Usage:
 *   await assertActiveSubscription(ctx.orgId);
 */

import { TRPCError } from "@trpc/server";
import { polar } from "@/lib/polar";
import { prisma } from "@/lib/db";

export async function assertActiveSubscription(orgId: string): Promise<void> {
  // ── Dev test bypass ────────────────────────────────────────────────────────
  // Set ENABLE_TEST_BYPASS=true in .env.local to skip subscription checks.
  // Never set this in production — SKIP_ENV_VALIDATION will not help you here.
  if (
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_TEST_BYPASS === "true"
  ) {
    return;
  }

  // ── 1. Polar check (card / international) ──────────────────────────────────
  try {
    const customerState = await polar.customers.getStateExternal({
      externalId: orgId,
    });
    if ((customerState.activeSubscriptions ?? []).length > 0) {
      return; // ✓ active Polar subscription — allow
    }
    // Customer exists in Polar but has no active subscription — fall through
    // to MoMo check before throwing, in case they have a parallel MoMo plan.
  } catch {
    // Customer does not exist in Polar at all — fall through to MoMo check.
  }

  // ── 2. MoMo check (MTN Mobile Money / Ugandan users) ──────────────────────
  const momoSub = await prisma.momoSubscription.findUnique({
    where:  { orgId },
    select: { status: true, expiresAt: true },
  });

  if (
    momoSub &&
    momoSub.status === "active" &&
    momoSub.expiresAt > new Date()
  ) {
    return; // ✓ active MoMo subscription — allow
  }

  // ── 3. Neither path has an active subscription ────────────────────────────
  throw new TRPCError({
    code:    "FORBIDDEN",
    message: "SUBSCRIPTION_REQUIRED",
  });
}
