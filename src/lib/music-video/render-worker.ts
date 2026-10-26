import * as Sentry from "@sentry/nextjs";
import { GenerationStatus } from "@/generated/prisma/client";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { prisma } from "@/lib/db";
import { composeMusicVideo } from "@/lib/ffmpeg";
import { signedUrl, uploadObject } from "@/lib/r2";
import { z } from "zod";

const MAX_SOURCE_BYTES = 500 * 1024 * 1024;
const MAX_RENDER_BYTES = 2 * 1024 * 1024 * 1024;
const STALE_JOB_MS = 30 * 60_000;
const POLL_INTERVAL_MS = 2_000;

const timelineSchema = z.object({
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]),
  audio: z.object({
    r2ObjectKey: z.string().min(1),
    mimeType: z.string().min(1),
    durationMs: z.number().int().positive(),
  }),
  scenes: z.array(
    z.object({
      startMs: z.number().int().nonnegative(),
      endMs: z.number().int().positive(),
      r2ObjectKey: z.string().min(1),
      mimeType: z.string().min(1),
      kind: z.enum(["IMAGE", "VIDEO"]),
    }),
  ).min(1),
});

async function downloadObject(key: string, destination: string): Promise<void> {
  const response = await fetch(await signedUrl(key));
  if (!response.ok || !response.body) {
    throw new Error(`Could not download render input (${response.status})`);
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_SOURCE_BYTES) {
    throw new Error("Render input exceeds the 500 MB limit");
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_SOURCE_BYTES) {
      await reader.cancel();
      throw new Error("Render input exceeds the 500 MB limit");
    }
    chunks.push(value);
  }
  await writeFile(destination, Buffer.concat(chunks, size));
}

async function claimNextRender() {
  const staleBefore = new Date(Date.now() - STALE_JOB_MS);
  await prisma.videoRender.updateMany({
    where: { status: "PROCESSING", updatedAt: { lt: staleBefore } },
    data: { status: "PENDING", errorMessage: "Requeued after worker interruption" },
  });

  const candidate = await prisma.videoRender.findFirst({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!candidate) return null;

  const claimed = await prisma.videoRender.updateMany({
    where: { id: candidate.id, status: "PENDING" },
    data: { status: "PROCESSING", errorMessage: null },
  });
  return claimed.count === 1 ? candidate.id : null;
}

async function processRender(renderId: string): Promise<void> {
  const render = await prisma.videoRender.findUnique({
    where: { id: renderId },
    include: {
      musicVideo: { select: { orgId: true } },
    },
  });
  if (!render) throw new Error(`Render ${renderId} was not found`);

  const timeline = timelineSchema.parse(render.timeline);
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "studio-render-"));
  try {
    const audioPath = path.join(tempDir, "audio");
    const outputPath = path.join(tempDir, "render.mp4");
    await downloadObject(timeline.audio.r2ObjectKey, audioPath);

    const sceneInputs = await Promise.all(
      timeline.scenes.map(async (scene, index) => {
        const filePath = path.join(tempDir, `scene-${index}`);
        await downloadObject(scene.r2ObjectKey, filePath);
        return {
          path: filePath,
          kind: scene.kind,
          durationSeconds: (scene.endMs - scene.startMs) / 1000,
        };
      }),
    );

    await composeMusicVideo({
      audioPath,
      scenes: sceneInputs,
      aspectRatio: timeline.aspectRatio,
      outputPath,
    });

    const output = await readFile(outputPath);
    if (output.byteLength === 0 || output.byteLength > MAX_RENDER_BYTES) {
      throw new Error("Rendered video is empty or exceeds the 2 GB limit");
    }
    const key =
      `music-videos/orgs/${render.musicVideo.orgId}/` +
      `${render.musicVideoId}/renders/${render.id}.mp4`;
    await uploadObject({
      buffer: output,
      key,
      contentType: "video/mp4",
    });

    await prisma.$transaction([
      prisma.videoRender.update({
        where: { id: render.id },
        data: {
          status: GenerationStatus.COMPLETED,
          r2ObjectKey: key,
          durationSeconds: timeline.audio.durationMs / 1000,
          fileSize: output.byteLength,
          errorMessage: null,
        },
      }),
      prisma.musicVideo.update({
        where: { id: render.musicVideoId },
        data: { status: "COMPLETED" },
      }),
    ]);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

export async function runMusicVideoRenderWorker(
  signal?: AbortSignal,
): Promise<void> {
  while (!signal?.aborted) {
    const renderId = await claimNextRender();
    if (!renderId) {
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      continue;
    }

    try {
      const heartbeat = setInterval(() => {
        prisma.videoRender
          .updateMany({
            where: { id: renderId, status: "PROCESSING" },
            data: { updatedAt: new Date() },
          })
          .catch((error: unknown) => {
            Sentry.logger.error("Music video worker heartbeat failed", {
              renderId,
              error: error instanceof Error ? error.message : String(error),
            });
          });
      }, 60_000);
      try {
        await processRender(renderId);
      } finally {
        clearInterval(heartbeat);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown render failure";
      await prisma.videoRender.update({
        where: { id: renderId },
        data: { status: "FAILED", errorMessage: message.slice(0, 500) },
      });
      const render = await prisma.videoRender.findUnique({
        where: { id: renderId },
        select: { musicVideoId: true },
      });
      if (render) {
        await prisma.musicVideo.update({
          where: { id: render.musicVideoId },
          data: { status: "FAILED" },
        });
      }
      Sentry.logger.error("Music video render failed", {
        renderId,
        error: message,
      });
    }
  }
}
