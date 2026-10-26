import { PRICING, type Resolution } from "./config";

export type Rail = "momo" | "polar";
export type Product = "song" | "image" | "clip";

export interface Quote {
  costUsd: number;
  costMicroUsd: number;
  costUgx: number;
  priceUgx: number;
  priceUsd: number;
  priceUsdCents: number;
  rail: Rail;
  polarMinimumPurchaseUsd: number;
}

export interface PublicQuote {
  priceUgx: number;
  priceUsd: number;
  rail: Rail;
  polarMinimumPurchaseUsd: number;
}

export function toPublicQuote(quote: Quote): PublicQuote {
  return {
    priceUgx: quote.priceUgx,
    priceUsd: quote.priceUsd,
    rail: quote.rail,
    polarMinimumPurchaseUsd: quote.polarMinimumPurchaseUsd,
  };
}

function make(
  costUsd: number,
  product: Product,
  rail: Rail,
): Quote {
  if (!Number.isFinite(costUsd) || costUsd < 0) {
    throw new RangeError("Provider cost must be a finite, non-negative amount");
  }
  const fee = PRICING.paymentFee[rail];
  const multiple = PRICING.multiple[product];
  const grossUsd = (costUsd * multiple) / (1 - fee);
  const costUgx = costUsd * PRICING.usdToUgx;
  const priceUsdCents = Math.ceil(grossUsd * 100);

  return {
    costUsd,
    costMicroUsd: Math.round(costUsd * 1_000_000),
    costUgx: Math.round(costUgx),
    priceUgx:
      Math.ceil(
        (costUgx * multiple) /
          (1 - fee) /
          PRICING.roundUpToUgx,
      ) * PRICING.roundUpToUgx,
    priceUsd: priceUsdCents / 100,
    priceUsdCents,
    rail,
    polarMinimumPurchaseUsd: PRICING.minPolarPurchaseUsd,
  };
}

export function quoteSong(seconds: number, rail: Rail, thinking = false) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new RangeError("Song duration must be finite and positive");
  }
  return make(
    seconds * PRICING.providerCostUsd.songPerSecond * (thinking ? 2 : 1),
    "song",
    rail,
  );
}

export function quoteImage(
  count: number,
  rail: Rail,
  width = 1920,
  height = 1080,
) {
  if (!Number.isInteger(count) || count <= 0) {
    throw new RangeError("Image count must be a positive integer");
  }
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new RangeError("Image dimensions must be positive integers");
  }
  const megapixels = Math.ceil((width * height) / 1_000_000);
  return make(
    count * megapixels * PRICING.providerCostUsd.imagePerMegapixel,
    "image",
    rail,
  );
}

export function quoteClip(
  seconds: number,
  resolution: Resolution,
  rail: Rail,
) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new RangeError("Clip duration must be finite and positive");
  }
  return make(
    seconds * PRICING.providerCostUsd.clipPerSecond[resolution],
    "clip",
    rail,
  );
}
