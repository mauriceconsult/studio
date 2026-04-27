/**
 * lib/billing/market.ts
 *
 * Derives the payment market from Clerk org publicMetadata.country.
 * "ug"         → MoMo (MTN Uganda)
 * "global"     → Polar (card / Stripe)
 * "unresolved" → country was never set — must be handled explicitly,
 *                never silently defaulted
 */

export type Market = "ug" | "global";
export type MarketOrUnresolved = Market | "unresolved";

export type MeterEvent =
  | "video_minutes"
  | "characters_synthesized"
  | "voices_cloned";

export type PlanId = "starter" | "pro";

/**
 * Resolves a country string to a market.
 * Returns "unresolved" (not "global") when country is missing so callers
 * are forced to handle the gap explicitly rather than silently billing wrong.
 */
export function deriveMarket(
  country: string | null | undefined,
): MarketOrUnresolved {
  if (!country) return "unresolved";
  return country.toUpperCase() === "UG" ? "ug" : "global";
}

/**
 * Asserts a market is resolved. Throws a typed error that surfaces as a
 * 412 PRECONDITION_FAILED on the client so the UI can prompt country setup.
 */
export function assertMarketResolved(
  market: MarketOrUnresolved,
  orgId: string,
): asserts market is Market {
  if (market === "unresolved") {
    throw new MarketUnresolvedError(orgId);
  }
}

export class MarketUnresolvedError extends Error {
  readonly code = "MARKET_UNRESOLVED" as const;
  readonly orgId: string;

  constructor(orgId: string) {
    super(
      `Billing market not set for org ${orgId}. ` +
        `Set publicMetadata.country via Clerk dashboard or onboarding.`,
    );
    this.name = "MarketUnresolvedError";
    this.orgId = orgId;
  }
}

/** Unified pricing model (per unit) */
export const OVERAGE_PRICES: Record<
  MeterEvent,
  { usdCents: number; ugx: number; unit: string; label: string }
> = {
  video_minutes: {
    usdCents: 120,
    ugx: 4_400,
    unit: "minute",
    label: "per video minute",
  },
  characters_synthesized: {
    usdCents: 30,
    ugx: 110,
    unit: "1k_chars",
    label: "per 1,000 characters",
  },
  voices_cloned: {
    usdCents: 250,
    ugx: 9_200,
    unit: "voice",
    label: "per cloned voice",
  },
};

/** Plan limits */
export const PLAN_INCLUDED: Record<PlanId, Record<MeterEvent, number>> = {
  starter: {
    video_minutes: 20,
    characters_synthesized: 100_000,
    voices_cloned: 1,
  },
  pro: {
    video_minutes: 300,
    characters_synthesized: 1_000_000,
    voices_cloned: 5,
  },
};
