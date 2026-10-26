import { fal } from "@fal-ai/client";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";

fal.config({ credentials: env.FAL_KEY });
const MODEL = env.SONG_FAL_MODEL;

const fileSchema = z.object({
  url: z
    .string()
    .url()
    .refine((value) => new URL(value).protocol === "https:"),
});

const resultSchema = z.object({
  audio: fileSchema.optional(),
  audio_file: fileSchema.optional(),
  duration: z.number().positive().optional(),
});

export const createSongSchema = z.object({
  lyrics: z.string().trim().min(1).max(4096),
  stylePrompt: z.string().trim().max(300).optional(),
  language: z.string().trim().min(2).max(40).default("en"),
  tempoBpm: z.number().int().min(30).max(300).optional(),
  durationSeconds: z.number().int().min(10).max(600).default(120),
  voiceId: z.string().trim().min(1).max(200).optional(),
  sourceApp: z.string().trim().min(1).max(80).default("studio"),
  sourceEntityId: z.string().trim().max(200).optional(),
});

// Voice is a vocal persona in phase 1, not voice cloning
export function buildStylePrompt(p: {
  stylePrompt?: string | null;
  tempoBpm?: number | null;
  vocalStyle?: string | null;
}) {
  return [p.stylePrompt, p.tempoBpm && `${p.tempoBpm} BPM`, p.vocalStyle]
    .filter(Boolean)
    .join(", ")
    .slice(0, 512); // provider prompt cap
}

export function webhookToken(id: string) {
  return createHmac("sha256", env.SONG_WEBHOOK_SECRET)
    .update(id)
    .digest("hex");
}

export function verifyWebhookToken(id: string, token: string) {
  if (!id || !/^[a-f0-9]{64}$/i.test(token)) return false;
  const expected = Buffer.from(webhookToken(id), "hex");
  const received = Buffer.from(token, "hex");
  return (
    expected.length === received.length && timingSafeEqual(expected, received)
  );
}

export async function submitSong(i: {
  id: string;
  prompt: string;
  lyrics: string;
  duration: number;
  bpm?: number | null;
  language: string;
}) {
  const webhookUrl = new URL("/api/songs/webhook", env.APP_URL);
  webhookUrl.searchParams.set("id", i.id);
  webhookUrl.searchParams.set("t", webhookToken(i.id));
  const { request_id } = await fal.queue.submit(MODEL, {
    input: {
      prompt: i.prompt,
      lyrics: i.lyrics,
      duration: i.duration,
      ...(i.bpm ? { bpm: i.bpm } : {}),
      vocal_language: i.language,
      thinking: false,
    },
    webhookUrl: webhookUrl.toString(),
  });
  if (!request_id) throw new Error("Fal did not return a request id");
  return request_id;
}

export function queueStatus(requestId: string) {
  return fal.queue.status(MODEL, { requestId });
}

export async function fetchSongResult(requestId: string) {
  const { data } = await fal.queue.result(MODEL, { requestId });
  const result = resultSchema.parse(data);
  const url = result.audio?.url ?? result.audio_file?.url;
  if (!url) throw new Error("Provider returned no audio URL");
  return { url, durationSeconds: result.duration };
}
