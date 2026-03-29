/**
 * POST /api/webhooks/momo
 * Receives inbound MoMo payment callbacks.
 *
 * Register this URL as your providerCallbackHost in MoMo sandbox/production.
 * Note: sandbox callbacks are unreliable — /api/momo-status polling is the
 * primary mechanism. This webhook is the production fast-path.
 *
 * MoMo does not send a signature header in sandbox — add HMAC verification
 * before going live using your primary key as the secret.
 */

import { NextRequest, NextResponse } from "next/server";
import { handleMoMoWebhook, MoMoPaymentStatus } from "@/lib/momo";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("[webhook/momo] Received:", JSON.stringify(body, null, 2));

    // MoMo sandbox callback shape:
    // {
    //   "financialTransactionId": "...",
    //   "externalId": "<your userId>",
    //   "amount": "120000",
    //   "currency": "UGX",
    //   "payer": { "partyIdType": "MSISDN", "partyId": "256771234567" },
    //   "payerMessage": "...",
    //   "payeeNote": "...",
    //   "status": "SUCCESSFUL" | "FAILED" | "CANCELLED",
    //   "reason": { "code": "...", "message": "..." }
    // }

    const referenceId =
      body.referenceId ??
      req.headers.get("x-reference-id") ??
      body.financialTransactionId;

    if (!referenceId) {
      console.warn("[webhook/momo] No referenceId in payload or headers");
      return NextResponse.json(
        { error: "Missing referenceId" },
        { status: 400 }
      );
    }

    const result = await handleMoMoWebhook({
      referenceId,
      status: body.status as MoMoPaymentStatus,
      externalId: body.externalId,
      reason: body.reason?.message ?? body.reason,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[webhook/momo]", err);
    // Always return 200 to MoMo — otherwise it retries aggressively
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
