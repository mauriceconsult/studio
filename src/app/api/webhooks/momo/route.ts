import { NextResponse } from "next/server";

import { handleStudio } from "@/lib/payments/handlers/studio";
import { MoMoWebhookPayload } from "@/lib/payments/momo";


export async function POST(req: Request) {
  try {
    const payload =
      (await req.json()) as MoMoWebhookPayload;

    await handleStudio(payload);

    return NextResponse.json({
      received: true,
    });
  } catch (error) {
    console.error("[MOMO_WEBHOOK]", error);

    return NextResponse.json(
      {
        received: false,
      },
      {
        status: 500,
      }
    );
  }
}