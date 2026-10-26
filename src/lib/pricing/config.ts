import { env } from "@/lib/env";

export type Resolution = "480p" | "580p" | "720p";

export const PRICING = {
  usdToUgx: env.PRICING_USD_UGX,
  paymentFee: {
    momo: env.PRICING_MOMO_PAYMENT_FEE,
    polar: env.PRICING_POLAR_PAYMENT_FEE,
  },
  roundUpToUgx: 100,
  providerCostUsd: {
    songPerSecond: env.PRICING_SONG_COST_PER_SECOND_USD,
    imagePerMegapixel: env.PRICING_IMAGE_COST_PER_MEGAPIXEL_USD,
    clipPerSecond: {
      "480p": env.CLIP_FAL_PRICE_PER_SECOND_480P,
      "580p": env.CLIP_FAL_PRICE_PER_SECOND_580P,
      "720p": env.CLIP_FAL_PRICE_PER_SECOND_720P,
    } satisfies Record<Resolution, number>,
  },
  multiple: {
    song: env.PRICING_SONG_MULTIPLE,
    image: env.PRICING_IMAGE_MULTIPLE,
    clip: env.PRICING_CLIP_MULTIPLE,
  },
  minPolarPurchaseUsd: env.PRICING_POLAR_MIN_PURCHASE_USD,
} as const;
