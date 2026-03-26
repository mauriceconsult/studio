// src/app/(dashboard)/text-to-speech/page.tsx
import type { Metadata } from "next";
import { trpc, HydrateClient, prefetch } from "@/trpc/server";
import { TextToSpeechView } from "./views/text-to-speech-view";

export const metadata: Metadata = { title: "Text to Speech" };

export default async function TextToSpeechPage({
  searchParams,
}: {
  searchParams: Promise<{ text?: string; voiceId?: string }>;
}) {
  const { text, voiceId } = await searchParams;
  prefetch(trpc.voices.getAll.queryOptions());
  prefetch(trpc.generations.getAll.queryOptions());

  return (
    <HydrateClient>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <TextToSpeechView initialValues={{ text, voiceId }} />
      </div>
    </HydrateClient>
  );
}
