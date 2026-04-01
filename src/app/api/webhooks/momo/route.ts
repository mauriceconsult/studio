/**
 * app/api/webhooks/momo/route.ts
 *
 * Receives MoMo payment status callbacks.
 * Handles two flows:
 *   1. Plan subscription activation (referenceId tied to a plan payment)
 *   2. PAYG top-up credit (referenceId tied to a MomoTopUp record)
 */

import { prisma } from "@/lib/db";
import {
  PLAN_INCLUDED,
  type PlanId,
  type MeterEvent,
} from "@/lib/billing/market";

const PLAN_DURATION_DAYS = 30;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function POST(req: Request) {
  const body = await req.json();

  // MoMo webhook payload shape (adjust to your provider's actual format)
  const { referenceId, status } = body as {
    referenceId: string;
    status: "SUCCESSFUL" | "FAILED" | "CANCELLED";
    reason?: string;
  };

  if (status !== "SUCCESSFUL") {
    // Mark top-up as failed if applicable
    await prisma.momoTopUp.updateMany({
      where: { referenceId, status: "pending" },
      data: { status: "failed" },
    });
    return Response.json({ received: true });
  }

  // ── Flow 1: PAYG top-up ───────────────────────────────────────────────────
  const topUp = await prisma.momoTopUp.findFirst({
    where: { referenceId, status: "pending" },
  });

  if (topUp) {
    await prisma.momoTopUp.update({
      where: { id: topUp.id },
      data: { status: "successful" },
    });

    const fieldMap: Record<MeterEvent, string> = {
      videos_generated: "videosRemaining",
      characters_synthesized: "charsRemaining",
      voices_cloned: "voicesRemaining",
    };

    const field = fieldMap[topUp.meter as MeterEvent];

    await prisma.momoCredits.update({
      where: { orgId: topUp.orgId },
      data: { [field]: { increment: topUp.quantity } },
    });

    // Resume paused job if tied to this top-up

    // in Manager's webhook — instead of prisma.job.update
    if (topUp.jobId) {
      await prisma.job.update({
        where: { id: topUp.jobId },
        data: { status: "queued" },
      });
    }

    return Response.json({ received: true, flow: "topup" });
  }

  // ── Flow 2: Plan subscription activation ──────────────────────────────────
  const sub = await prisma.momoSubscription.findFirst({
    where: { referenceId, status: { not: "active" } },
  });

  if (sub) {
    const plan = sub.plan as PlanId;
    const included = PLAN_INCLUDED[plan];
    const now = new Date();

    await prisma.momoSubscription.update({
      where: { id: sub.id },
      data: {
        status: "active",
        expiresAt: addDays(now, PLAN_DURATION_DAYS),
      },
    });

    // Upsert credits — reset included units for the new billing period
    await prisma.momoCredits.upsert({
      where: { orgId: sub.orgId },
      update: {
        videosRemaining:
          included.videos_generated === Infinity
            ? 999_999
            : included.videos_generated,
        charsRemaining:
          included.characters_synthesized === Infinity
            ? 999_999_999
            : included.characters_synthesized,
        voicesRemaining:
          included.voices_cloned === Infinity
            ? 999_999
            : included.voices_cloned,
      },
      create: {
        orgId: sub.orgId,
        subscriptionId: sub.id,
        videosRemaining:
          included.videos_generated === Infinity
            ? 999_999
            : included.videos_generated,
        charsRemaining:
          included.characters_synthesized === Infinity
            ? 999_999_999
            : included.characters_synthesized,
        voicesRemaining:
          included.voices_cloned === Infinity
            ? 999_999
            : included.voices_cloned,
      },
    });

    return Response.json({ received: true, flow: "subscription" });
  }

  // Unknown referenceId — log and acknowledge
  console.warn("[momo-webhook] Unmatched referenceId:", referenceId);
  return Response.json({ received: true, flow: "unknown" });
}
