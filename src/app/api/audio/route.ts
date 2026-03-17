import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { generateSpeech } from "@/lib/chatterbox/client";
import type { TTSRequest } from "@/lib/chatterbox/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // ← Vercel max for audio generation

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body: TTSRequest = await req.json();

  if (!body.text || body.text.trim().length === 0) {
    return new NextResponse("Text is required", { status: 400 });
  }

  if (body.text.length > 5000) {
    return new NextResponse("Text exceeds 5000 character limit", {
      status: 400,
    });
  }

  try {
    const audio = await generateSpeech(body);
    return NextResponse.json(audio);
  } catch (error) {
    console.error("[AUDIO_GENERATE]", error);
    return new NextResponse("Audio generation failed", { status: 500 });
  }
}
