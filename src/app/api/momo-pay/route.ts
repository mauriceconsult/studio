/**
 * POST /api/momo-pay
 * Initiates a MoMo Request to Pay and returns a referenceId for polling.
 *
 * Body: { userId: string, phone: string, plan: "starter" | "pro", amount: number }
 */

import { NextRequest, NextResponse } from "next/server";
import { requestToPay } from "@/lib/momo";

const PLAN_PRICES: Record<string, number> = {
  starter: 50000,  // UGX 50,000/month
  pro: 120000,     // UGX 120,000/month
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, phone, plan } = body as {
      userId: string;
      phone: string;
      plan: string;
    };

    if (!userId || !phone || !plan) {
      return NextResponse.json(
        { error: "userId, phone, and plan are required" },
        { status: 400 }
      );
    }

    const amount = PLAN_PRICES[plan];
    if (!amount) {
      return NextResponse.json(
        { error: `Unknown plan: ${plan}. Valid plans: ${Object.keys(PLAN_PRICES).join(", ")}` },
        { status: 400 }
      );
    }

    const referenceId = await requestToPay({
      amount,
      phone,
      externalId: userId,
      payerMessage: `Studio ${plan} plan — monthly subscription`,
      payeeNote: `Plan: ${plan} | User: ${userId}`,
    });

    return NextResponse.json({ referenceId, plan, amount });
  } catch (err) {
    console.error("[api/momo-pay]", err);
    return NextResponse.json(
      { error: "Failed to initiate payment" },
      { status: 500 }
    );
  }
}
