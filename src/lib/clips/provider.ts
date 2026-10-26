import { fal } from "@fal-ai/client";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { env } from "@/lib/env";
import type { Resolution } from "@/lib/pricing/config";

fal.config({ credentials: env.FAL_KEY });
const T2V = env.CLIP_FAL_T2V_MODEL;
const I2V = env.CLIP_FAL_I2V_MODEL;

const token = (id: string) =>
  createHmac("sha256", env.CLIP_WEBHOOK_SECRET)
    .update(`clip:${id}`)
    .digest("hex");
export function verifyClipToken(id: string, t: string) {
  if (!id || !/^[a-f0-9]{64}$/i.test(t)) return false;
  const expected = Buffer.from(token(id), "hex");
  const received = Buffer.from(t, "hex");
  return (
    expected.length === received.length &&
    timingSafeEqual(expected, received)
  );
}

const resultSchema = z.object({
  video: z.object({
    url: z
      .string()
      .url()
      .refine((value) => new URL(value).protocol === "https:"),
  }),
});

// Returns provider = "fal:<model>" so status/result can find the right endpoint later
export async function submitClip(i: {
  id: string;
  prompt: string;
  durationSeconds: number;
  aspectRatio: string;
  resolution: Resolution;
  imageUrl?: string;
}) {
  const model = i.imageUrl ? I2V : T2V;
  const webhookUrl = new URL("/api/clips/webhook", env.APP_URL);
  webhookUrl.searchParams.set("id", i.id);
  webhookUrl.searchParams.set("t", token(i.id));
  const numFrames = i.durationSeconds * 16;
  if (numFrames < 17 || numFrames > 161) {
    throw new RangeError("Video duration must produce between 17 and 161 frames");
  }
  if (!["16:9", "9:16", "1:1"].includes(i.aspectRatio)) {
    throw new Error(`Unsupported video aspect ratio: ${i.aspectRatio}`);
  }
  const { request_id } = await fal.queue.submit(model, {
    input: {
      prompt: i.prompt,
      num_frames: numFrames,
      fps: 16,
      resolution: i.resolution,
      aspect_ratio: i.aspectRatio,
      ...(i.imageUrl ? { image_url: i.imageUrl } : {}),
    },
    webhookUrl: webhookUrl.toString(),
  });
  if (!request_id) throw new Error("Fal did not return a request id");
  return { requestId: request_id, provider: `fal:${model}` };
}

function getModel(provider: string) {
  if (!provider.startsWith("fal:")) {
    throw new Error(`Unsupported video clip provider: ${provider}`);
  }
  return provider.slice("fal:".length);
}

export const clipQueueStatus = (provider: string, requestId: string) =>
  fal.queue.status(getModel(provider), { requestId });

export async function fetchClipResult(provider: string, requestId: string) {
  const { data } = await fal.queue.result(getModel(provider), {
    requestId,
  });
  return resultSchema.parse(data).video;
}
