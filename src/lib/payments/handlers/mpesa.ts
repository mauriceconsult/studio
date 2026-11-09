import { prisma } from "@/lib/db";
import {
  PLAN_INCLUDED,
  type MeterEvent,
  type PlanId,
} from "@/lib/billing/market";
import type { MpesaStkQueryResponse } from "@/lib/payments/mpesa";

const PLAN_DURATION_DAYS = 30;

const CREDIT_FIELD: Record<
  MeterEvent,
  "minutesRemaining" | "charsRemaining" | "voicesRemaining"
> = {
  video_minutes: "minutesRemaining",
  characters_synthesized: "charsRemaining",
  voices_cloned: "voicesRemaining",
};

function asResultCode(code: string | number | undefined): number | null {
  if (code === undefined) return null;
  const parsed = Number(code);
  return Number.isInteger(parsed) ? parsed : null;
}

export async function recordMpesaFailure(
  checkoutRequestId: string,
  resultCode: string | number | undefined,
  resultDescription: string | undefined,
): Promise<void> {
  await prisma.mpesaPayment.updateMany({
    where: { checkoutRequestId, status: "pending" },
    data: {
      status: "failed",
      resultCode: resultCode === undefined ? null : String(resultCode),
      resultDescription: resultDescription?.slice(0, 500) ?? null,
    },
  });
}

export async function finalizeMpesaPayment(
  checkoutRequestId: string,
  result: MpesaStkQueryResponse,
): Promise<void> {
  const resultCode = asResultCode(result.ResultCode);
  if (resultCode === null || resultCode !== 0) return;

  const payment = await prisma.mpesaPayment.findUnique({
    where: { checkoutRequestId },
  });
  if (!payment || payment.status !== "pending") return;

  if (
    result.Amount !== undefined &&
    Number(result.Amount) !== payment.amountKes
  ) {
    await prisma.mpesaPayment.updateMany({
      where: { id: payment.id, status: "pending" },
      data: {
        status: "review",
        resultCode: String(result.ResultCode),
        resultDescription: "Daraja-confirmed amount did not match the order",
      },
    });
    console.error("[mpesa-payment] Confirmed amount mismatch", {
      paymentId: payment.id,
      expectedKes: payment.amountKes,
      receivedKes: result.Amount,
    });
    return;
  }

  await prisma.$transaction(async (tx) => {
    const claimed = await tx.mpesaPayment.updateMany({
      where: { id: payment.id, status: "pending" },
      data: {
        status: "successful",
        receipt: result.MpesaReceiptNumber ?? null,
        resultCode: String(result.ResultCode),
        resultDescription: result.ResultDesc?.slice(0, 500) ?? null,
      },
    });
    if (claimed.count === 0) return;

    if (payment.purpose === "plan") {
      if (!payment.plan || !["starter", "pro"].includes(payment.plan)) {
        throw new Error(`Invalid plan on Daraja payment ${payment.id}`);
      }

      const plan = payment.plan as PlanId;
      const included = PLAN_INCLUDED[plan];
      const now = new Date();
      const existing = await tx.mpesaSubscription.findUnique({
        where: { orgId: payment.orgId },
      });
      const base = existing && existing.expiresAt > now ? existing.expiresAt : now;
      const expiresAt = new Date(base);
      expiresAt.setDate(expiresAt.getDate() + PLAN_DURATION_DAYS);

      const subscription = await tx.mpesaSubscription.upsert({
        where: { orgId: payment.orgId },
        update: {
          plan,
          status: "active",
          phone: payment.phone,
          referenceId: checkoutRequestId,
          expiresAt,
        },
        create: {
          orgId: payment.orgId,
          plan,
          status: "active",
          phone: payment.phone,
          referenceId: checkoutRequestId,
          expiresAt,
        },
      });

      await tx.mpesaCredits.upsert({
        where: { orgId: payment.orgId },
        update: {
          subscriptionId: subscription.id,
          minutesRemaining: included.video_minutes,
          charsRemaining: included.characters_synthesized,
          voicesRemaining: included.voices_cloned,
        },
        create: {
          orgId: payment.orgId,
          subscriptionId: subscription.id,
          minutesRemaining: included.video_minutes,
          charsRemaining: included.characters_synthesized,
          voicesRemaining: included.voices_cloned,
        },
      });
      return;
    }

    if (payment.purpose !== "topup" || !payment.meter || !payment.quantity) {
      throw new Error(`Invalid top-up details on Daraja payment ${payment.id}`);
    }
    const field = CREDIT_FIELD[payment.meter as MeterEvent];
    if (!field) throw new Error(`Invalid meter on Daraja payment ${payment.id}`);

    const credits = await tx.mpesaCredits.updateMany({
      where: { orgId: payment.orgId },
      data: { [field]: { increment: payment.quantity } },
    });
    if (credits.count === 0) {
      throw new Error(`No Daraja credit account for payment ${payment.id}`);
    }
  });
}

export async function reconcileMpesaPayment(
  checkoutRequestId: string,
  result: MpesaStkQueryResponse,
): Promise<void> {
  const resultCode = asResultCode(result.ResultCode);
  if (resultCode === 0) {
    await finalizeMpesaPayment(checkoutRequestId, result);
  } else if (resultCode !== null) {
    await recordMpesaFailure(
      checkoutRequestId,
      result.ResultCode,
      result.ResultDesc ?? result.ResponseDescription,
    );
  }
}
