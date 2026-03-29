/**
 * GET /api/momo-status?id=<referenceId>
 * Polls MoMo for payment status — mirrors /api/job-status exactly.
 *
 * Returns: { referenceId, status, reason? }
 * status: PENDING | SUCCESSFUL | FAILED | CANCELLED
 */

import { NextRequest, NextResponse } from "next/server";
import { getPaymentStatus } from "@/lib/momo";
import { activatePlan } from "@/lib/momo";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const referenceId = searchParams.get("id");

    if (!referenceId) {
      return NextResponse.json(
        { error: "referenceId is required as ?id=" },
        { status: 400 }
      );
    }

    const result = await getPaymentStatus(referenceId);

    // On success, activate plan if not already active
    if (result.status === "SUCCESSFUL") {
      const payment = await prisma.momoPayment.findUnique({
        where: { referenceId },
      });

      if (payment) {
        const existing = await prisma.subscription.findUnique({
          where: { userId: payment.externalId },
        });

        // Only activate if not already activated for this reference
        if (!existing || existing.momoReferenceId !== referenceId) {
          await activatePlan(payment.externalId, "pro", referenceId);
        }
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("[api/momo-status]", err);
    return NextResponse.json(
      { error: "Failed to fetch payment status" },
      { status: 500 }
    );
  }
}
