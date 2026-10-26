import { prisma } from "@/lib/db";
import { completeVideoClipGeneration } from "@/lib/music-video/output";
import { fetchClipResult } from "./provider";

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;

export async function processClip(id: string, requestId?: string) {
  const clip = await prisma.videoClipGeneration.findUnique({ where: { id } });
  if (!clip || clip.status === "COMPLETED" || clip.status === "FAILED") return;

  const jobId = clip.providerJobId ?? requestId;
  if (!jobId) throw new Error("No provider job id");
  if (clip.providerJobId && requestId && clip.providerJobId !== requestId) {
    throw new Error("Webhook request id does not match the stored provider job");
  }

  const { url } = await fetchClipResult(clip.provider, jobId);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Video download failed: ${res.status}`);
  const type = (res.headers.get("content-type") ?? "").split(";")[0];
  if (type !== "video/webm" && type !== "video/mp4") {
    throw new Error(`Unsupported provider video content type: ${type || "unknown"}`);
  }
  const contentLength = Number(res.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_VIDEO_BYTES) {
    throw new Error("Provider video exceeds the 500 MB limit");
  }
  if (!res.body) throw new Error("Provider video response has no body");
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_VIDEO_BYTES) {
      await reader.cancel();
      throw new Error("Provider video exceeds the 500 MB limit");
    }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks, totalBytes);

  await completeVideoClipGeneration({
    generationId: id,
    video: bytes,
    mimeType: type,
    durationSeconds: clip.durationSeconds,
  });
}
