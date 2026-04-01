/**
 * lib/billing/market.ts
 *
 * Derives the payment market from Clerk user metadata set at signup.
 * "ug" → MoMo (MTN Uganda)
 * "global" → Polar (card / Stripe)
 */

export type Market = "ug" | "global";

export type MeterEvent =
  | "videos_generated"
  | "characters_synthesized"
  | "voices_cloned";

export type PlanId = "starter" | "pro";

/** Resolved from Clerk publicMetadata.country at signup */
export function deriveMarket(country: string | null | undefined): Market {
  const UG_COUNTRIES = ["UG"]; // extend for KE, TZ, RW when ready
  if (!country) return "global";
  return UG_COUNTRIES.includes(country.toUpperCase()) ? "ug" : "global";
}

/** Per-unit PAYG overage prices (USD cents for Polar, UGX for MoMo display) */
export const OVERAGE_PRICES: Record<MeterEvent, { usdCents: number; ugx: number; label: string }> = {
  videos_generated:      { usdCents: 225, ugx: 8_300,  label: "per tutorial"         },
  characters_synthesized:{ usdCents: 30,  ugx: 110,    label: "per 1,000 characters"  },
  voices_cloned:         { usdCents: 150, ugx: 5_500,  label: "per cloned voice"      },
};

/** Included units per plan (before PAYG kicks in) */
export const PLAN_INCLUDED: Record<PlanId, Record<MeterEvent, number>> = {
  starter: {
    videos_generated:       8,
    characters_synthesized: 100_000, // ~100k chars
    voices_cloned:          1,
  },
  pro: {
    videos_generated:       Infinity,
    characters_synthesized: Infinity,
    voices_cloned:          5,
  },
};
