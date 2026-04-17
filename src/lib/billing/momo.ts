// src/lib/billing/momo.ts
import { env } from "@/lib/env";

const MOMO_BASE_URL =  env.MOMO_BASE_URL || "https://sandbox.momodeveloper.mtn.com";

const requiredEnvVars = [
  "MOMO_SUBSCRIPTION_KEY",
  "MOMO_API_USER",
  "MOMO_API_KEY",
];

function assertMoMoEnv() {
  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      throw new Error(`Missing env var: ${key}`);
    }
  }
}

async function getMoMoToken(): Promise<string> {
  assertMoMoEnv();

  const credentials = Buffer.from(
    `${env.MOMO_API_USER}:${env.MOMO_API_KEY}`
  ).toString("base64");

  const res = await fetch(`${MOMO_BASE_URL}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": env.MOMO_SUBSCRIPTION_KEY!,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MoMo token error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

export interface MoMoRequestToPayParams {
  amount: number; // in UGX
  currency?: string;
  phoneNumber: string; // e.g. "256771234567"
  externalId: string; // your order/invoice ID
  payerMessage?: string;
  payeeNote?: string;
}

export interface MoMoRequestToPayResult {
  referenceId: string; // UUID — use to poll status
}

/**
 * Initiates a MoMo Request-to-Pay (collection).
 * Returns the referenceId to poll for payment status.
 */
export async function momoRequestToPay(
  params: MoMoRequestToPayParams
): Promise<MoMoRequestToPayResult> {
  const token = await getMoMoToken();
  const referenceId = crypto.randomUUID();

  const res = await fetch(`${MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Ocp-Apim-Subscription-Key": env.MOMO_SUBSCRIPTION_KEY!,
      "X-Reference-Id": referenceId,
      "X-Target-Environment":
  process.env.MOMO_BASE_URL === "production" ? "mtnuganda" : "sandbox",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: String(params.amount),
      currency: params.currency ?? "UGX",
      externalId: params.externalId,
      payer: {
        partyIdType: "MSISDN",
        partyId: params.phoneNumber,
      },
      payerMessage: params.payerMessage ?? "Payment",
      payeeNote: params.payeeNote ?? "Thank you",
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MoMo requestToPay error ${res.status}: ${body}`);
  }

  // 202 Accepted — payment is pending
  return { referenceId };
}

export type MoMoPaymentStatus = "PENDING" | "SUCCESSFUL" | "FAILED";

export async function getMoMoPaymentStatus(
  referenceId: string
): Promise<MoMoPaymentStatus> {
  const token = await getMoMoToken();

  const res = await fetch(
    `${MOMO_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Ocp-Apim-Subscription-Key": env.MOMO_SUBSCRIPTION_KEY!,
        "X-Target-Environment":
          env.MOMO_BASE_URL === "production" ? "mtnuganda" : "sandbox",
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`MoMo status check error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.status as MoMoPaymentStatus;
}
