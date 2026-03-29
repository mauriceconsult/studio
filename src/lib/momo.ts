/**
 * lib/momo.ts
 * MTN MoMo Collections client — mirrors lib/job.ts patterns.
 * Handles token generation, Request to Pay, and payment status polling.
 */

import { prisma } from "@/lib/db";

// ── Config ─────────────────────────────────────────────────────────────────

const MOMO_BASE_URL =
  process.env.MOMO_TARGET_ENVIRONMENT ??
  "https://sandbox.momodeveloper.mtn.com";

const PRIMARY_KEY = process.env.MOMO_PRIMARY_KEY ?? "";
const USER_ID = process.env.MOMOUSER_ID ?? "";
const USER_SECRET = process.env.MOMOUSER_SECRET ?? "";

if (!PRIMARY_KEY || !USER_ID || !USER_SECRET) {
  console.warn("[momo] Missing MoMo credentials — check your .env");
}

// ── Types ──────────────────────────────────────────────────────────────────

export type MoMoPaymentStatus =
  | "PENDING"
  | "SUCCESSFUL"
  | "FAILED"
  | "CANCELLED";

export interface RequestToPayParams {
  amount: number;         // in UGX (no decimals)
  currency?: string;      // defaults to UGX
  phone: string;          // e.g. "256771234567" (no +)
  externalId: string;     // your internal reference (e.g. jobId or userId)
  payerMessage?: string;  // shown to payer on MoMo prompt
  payeeNote?: string;     // shown to payee (you) in dashboard
}

export interface MoMoPaymentResult {
  referenceId: string;
  status: MoMoPaymentStatus;
  reason?: string;
}

// ── Token ──────────────────────────────────────────────────────────────────

/**
 * Fetches a short-lived Bearer token from MoMo.
 * Tokens expire in ~1 hour; for production, cache and refresh.
 */
export async function getMoMoToken(): Promise<string> {
  const credentials = Buffer.from(`${USER_ID}:${USER_SECRET}`).toString(
    "base64"
  );

  const res = await fetch(`${MOMO_BASE_URL}/collection/token/`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Ocp-Apim-Subscription-Key": PRIMARY_KEY,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[momo] Token fetch failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

// ── Request to Pay ─────────────────────────────────────────────────────────

/**
 * Initiates a Request to Pay — prompts the user's MoMo wallet for approval.
 * Returns a referenceId you can use to poll payment status.
 */
export async function requestToPay(
  params: RequestToPayParams
): Promise<string> {
  const token = await getMoMoToken();
  const referenceId = crypto.randomUUID();

  const res = await fetch(`${MOMO_BASE_URL}/collection/v1_0/requesttopay`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Reference-Id": referenceId,
      "X-Target-Environment": isSandbox() ? "sandbox" : "mtnuganda",
      "Ocp-Apim-Subscription-Key": PRIMARY_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: String(params.amount),
      currency: params.currency ?? "UGX",
      externalId: params.externalId,
      payer: {
        partyIdType: "MSISDN",
        partyId: params.phone,
      },
      payerMessage: params.payerMessage ?? "Studio subscription payment",
      payeeNote: params.payeeNote ?? "Studio plan activation",
    }),
  });

  if (res.status !== 202) {
    const body = await res.text();
    throw new Error(
      `[momo] Request to Pay failed (${res.status}): ${body}`
    );
  }

  // Persist the pending payment in DB
  await prisma.momoPayment.create({
    data: {
      referenceId,
      externalId: params.externalId,
      phone: params.phone,
      amount: params.amount,
      currency: params.currency ?? "UGX",
      status: "PENDING",
    },
  });

  return referenceId;
}

// ── Payment Status ─────────────────────────────────────────────────────────

/**
 * Polls MoMo for the current status of a payment.
 * Mirror of getJob() — call this from your /api/momo-status route.
 */
export async function getPaymentStatus(
  referenceId: string
): Promise<MoMoPaymentResult> {
  const token = await getMoMoToken();

  const res = await fetch(
    `${MOMO_BASE_URL}/collection/v1_0/requesttopay/${referenceId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Target-Environment": isSandbox() ? "sandbox" : "mtnuganda",
        "Ocp-Apim-Subscription-Key": PRIMARY_KEY,
      },
    }
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `[momo] Status check failed (${res.status}): ${body}`
    );
  }

  const data = await res.json();

  // Sync status to DB
  await prisma.momoPayment.update({
    where: { referenceId },
    data: { status: data.status },
  });

  return {
    referenceId,
    status: data.status as MoMoPaymentStatus,
    reason: data.reason,
  };
}

// ── Plan Activation ────────────────────────────────────────────────────────

/**
 * Called after a SUCCESSFUL MoMo payment to activate a user's plan.
 * Mirror of updateJob() — single source of truth for plan state.
 */
export async function activatePlan(
  userId: string,
  plan: string,
  referenceId: string
) {
  return prisma.subscription.upsert({
    where: { userId },
    update: {
      plan,
      status: "active",
      momoReferenceId: referenceId,
      activatedAt: new Date(),
    },
    create: {
      userId,
      plan,
      status: "active",
      momoReferenceId: referenceId,
      activatedAt: new Date(),
    },
  });
}

// ── Webhook Handler ────────────────────────────────────────────────────────

/**
 * Validates and processes an inbound MoMo callback.
 * Wire this to: POST /api/webhooks/momo
 *
 * MoMo POSTs to your providerCallbackHost when payment status changes.
 * In sandbox, callbacks are unreliable — use getPaymentStatus() for polling.
 */
export async function handleMoMoWebhook(body: {
  referenceId: string;
  status: MoMoPaymentStatus;
  externalId?: string;
  reason?: string;
}) {
  const { referenceId, status, externalId } = body;

  // Update payment record
  await prisma.momoPayment.update({
    where: { referenceId },
    data: { status },
  });

  if (status === "SUCCESSFUL" && externalId) {
    // externalId is the userId you passed in requestToPay()
    // Activate the plan — extend this to pass the plan name via metadata
    await activatePlan(externalId, "pro", referenceId);
  }

  return { received: true, referenceId, status };
}

// ── Helpers ────────────────────────────────────────────────────────────────

function isSandbox(): boolean {
  return MOMO_BASE_URL.includes("sandbox");
}
