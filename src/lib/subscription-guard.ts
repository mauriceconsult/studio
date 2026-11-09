/**
 * lib/subscription-guard.ts
 *
 * Single subscription check used by every generation router.
 * Checks only the subscription provider selected by the organization's
 * configured country: MTN MoMo, Daraja, or Polar.
 *
 * Throws TRPCError FORBIDDEN if neither source has an active subscription.
 *
 * Usage:
 *   await assertActiveSubscription(ctx.orgId);
 */

import { TRPCError } from "@trpc/server";
import { clerkClient } from "@clerk/nextjs/server";
import { polar } from "@/lib/polar";
import { prisma } from "@/lib/db";
import {
  assertMarketResolved,
  deriveMarket,
  type MarketOrUnresolved,
} from "@/lib/billing/market";

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

  const client = await clerkClient();
  const org = await client.organizations.getOrganization({
    organizationId: orgId,
  });
  const market: MarketOrUnresolved = deriveMarket(
    org.publicMetadata?.country as string | undefined,
  );
  assertMarketResolved(market, orgId);

  if (market === "ug") {
    const subscription = await prisma.momoSubscription.findUnique({
      where: { orgId },
      select: { status: true, expiresAt: true },
    });
    if (
      subscription?.status === "active" &&
      subscription.expiresAt > new Date()
    ) {
      return;
    }
  } else if (market === "ke") {
    const subscription = await prisma.mpesaSubscription.findUnique({
      where: { orgId },
      select: { status: true, expiresAt: true },
    });
    if (
      subscription?.status === "active" &&
      subscription.expiresAt > new Date()
    ) {
      return;
    }
  } else {
    const customerState = await polar.customers.getStateExternal({
      externalId: orgId,
    });
    if ((customerState.activeSubscriptions ?? []).length > 0) return;
  }

  throw new TRPCError({
    code:    "FORBIDDEN",
    message: "SUBSCRIPTION_REQUIRED",
  });
}
