import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { queryMpesaStkPush } from "@/lib/payments/mpesa";
import {
  finalizeMpesaPayment,
  recordMpesaFailure,
} from "@/lib/payments/handlers/mpesa";

interface MpesaCallbackItem {
  Name?: string;
  Value?: string | number;
}

interface MpesaCallbackPayload {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string;
      CheckoutRequestID?: string;
      ResultCode?: number;
      ResultDesc?: string;
      CallbackMetadata?: { Item?: MpesaCallbackItem[] };
    };
  };
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as MpesaCallbackPayload;
    const callback = payload.Body?.stkCallback;
    const checkoutRequestId = callback?.CheckoutRequestID;
    if (!callback || !checkoutRequestId) {
      return NextResponse.json({ received: false }, { status: 400 });
    }

    const payment = await prisma.mpesaPayment.findUnique({
      where: { checkoutRequestId },
      select: {
        id: true,
        status: true,
        merchantRequestId: true,
      },
    });
    if (!payment) {
      console.warn("[mpesa-webhook] Unmatched checkout request", {
        checkoutRequestId,
      });
      return NextResponse.json({ received: true });
    }
    if (payment.status !== "pending") {
      return NextResponse.json({ received: true });
    }
    if (
      callback.MerchantRequestID &&
      payment.merchantRequestId &&
      callback.MerchantRequestID !== payment.merchantRequestId
    ) {
      console.error("[mpesa-webhook] Merchant request ID mismatch", {
        paymentId: payment.id,
      });
      return NextResponse.json({ received: false }, { status: 400 });
    }

    if (callback.ResultCode !== 0) {
      await recordMpesaFailure(
        checkoutRequestId,
        callback.ResultCode,
        callback.ResultDesc,
      );
      return NextResponse.json({ received: true });
    }

    const verified = await queryMpesaStkPush(checkoutRequestId);
    await finalizeMpesaPayment(checkoutRequestId, verified);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[MPESA_WEBHOOK]", error);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
