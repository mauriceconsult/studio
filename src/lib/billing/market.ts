/**
 * lib/billing/market.ts
 *
 * Derives the payment market from Clerk user metadata set at signup.
 * "ug" → MoMo (MTN Uganda)
 * "global" → Polar (card / Stripe)
 */

export type Market = "ug" | "global";

export type MeterEvent =
  | "video_minutes"
  | "characters_synthesized"
  | "voices_cloned";

export type PlanId = "starter" | "pro";

/** Resolve market */
export function deriveMarket(country: string | null | undefined): Market {
  const UG_COUNTRIES = ["UG"];
  if (!country) return "global";
  return UG_COUNTRIES.includes(country.toUpperCase()) ? "ug" : "global";
}

/** Unified pricing model (per unit) */
export const OVERAGE_PRICES: Record<
  MeterEvent,
  { usdCents: number; ugx: number; unit: string; label: string }
> = {
  video_minutes: {
    usdCents: 120, // $1.20 per minute (safe margin baseline)
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
    usdCents: 250, // increased from 150 → safer
    ugx: 9_200,
    unit: "voice",
    label: "per cloned voice",
  },
};

/** Plan limits (NO hard infinity) */
export const PLAN_INCLUDED: Record<PlanId, Record<MeterEvent, number>> = {
  starter: {
    video_minutes: 20, // ~6–10 short videos
    characters_synthesized: 100_000,
    voices_cloned: 1,
  },

  pro: {
    video_minutes: 300, // ~5 hours content
    characters_synthesized: 1_000_000,
    voices_cloned: 5,
  },
};
