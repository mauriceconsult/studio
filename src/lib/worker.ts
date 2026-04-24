import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { generateTTS } from "@/lib/tts";
import { composeVideo } from "@/lib/ffmpeg";
import { splitScript, toSRT } from "@/lib/segment";
import { debit, hasAccess } from "@/lib/platform";
import { prisma } from "@/lib/db";
import { systemPrompt } from "@/trpc/routers/text-generations-router";


const OUT_DIR = path.join(process.cwd(), "public", "videos");
const execFileAsync = promisify(execFile);

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = "pending" | "processing" | "done" | "error";

type JobUpdate = {
  status?:       JobStatus;
  progress?:     number;
  result?:       string;
  errorMessage?: string;
};

type VideoUpdate = JobUpdate & { outputUrl?: string };

// ─── Prisma helpers ───────────────────────────────────────────────────────────

async function updateCourse(id: string, data: JobUpdate): Promise<void> {
  const { result, ...rest } = data;
  await prisma.course.update({
    where: { id },
    data: {
      ...rest,
      ...(result !== undefined ? { result: { output: result } } : {}),
    },
  });
}

async function updateVideo(id: string, data: VideoUpdate): Promise<void> {
  const { outputUrl, ...rest } = data;
  await prisma.video.update({
    where: { id },
    data: {
      ...rest,
      ...(outputUrl !== undefined ? { outputUrl } : {}),
    },
  });
}

// ─── ffprobe ──────────────────────────────────────────────────────────────────

async function getVideoMinutes(videoPath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      videoPath,
    ]);
    const seconds = parseFloat(stdout.trim());
    if (!isNaN(seconds) && seconds > 0) return Math.ceil(seconds / 60);
  } catch {
    // ffprobe unavailable — bill 1 minute as safe fallback
  }
  return 1;
}

// ─── Shared video pipeline ────────────────────────────────────────────────────

async function runPipeline(
  jobId: string,
  script: string,
  onProgress: (progress: number) => Promise<void>,
): Promise<{ videoPath: string; videoMinutes: number }> {
  await mkdir(OUT_DIR, { recursive: true });

  const audioPath = path.join(OUT_DIR, `${jobId}.wav`);
  const srtPath   = path.join(OUT_DIR, `${jobId}.srt`);
  const videoPath = path.join(OUT_DIR, `${jobId}.mp4`);

  const audioBuffer = await generateTTS(script);
  await writeFile(audioPath, audioBuffer);
  await onProgress(30);

  const segments = splitScript(script);
  await writeFile(srtPath, toSRT(segments));
  await onProgress(50);

  const imagePaths = segments.map(() =>
    path.join(process.cwd(), "public", "slides", "default.png"),
  );
  await onProgress(65);

  await composeVideo({ audioPath, imagePaths, srtPath, outputPath: videoPath });
  await onProgress(85);

  const videoMinutes = await getVideoMinutes(videoPath);
  return { videoPath, videoMinutes };
}

async function debitGenerationCredits(
  userId: string,
  script: string,
  videoMinutes: number,
  jobId: string,
): Promise<void> {
  await Promise.allSettled([
    debit({
      userId,
      app:       "studio",
      eventType: "characters_synthesized",
      amount:    ttsCreditCost(script),
      meta:      { jobId },
    }),
    debit({
      userId,
      app:       "studio",
      eventType: "video_minutes",
      amount:    videoMinutes,
      meta:      { jobId, videoMinutes: String(videoMinutes) },
    }),
  ]);
}

// ─── Course job ───────────────────────────────────────────────────────────────

export async function runCourseJob(
  jobId: string,
  script: string,
  userId: string,
): Promise<void> {
  const allowed = await hasAccess(userId, "studio");
  if (!allowed) {
    await updateCourse(jobId, {
      status:       "error",
      errorMessage: "Access denied — user does not have studio access",
    });
    return;
  }

  try {
    await updateCourse(jobId, { status: "processing", progress: 10 });

    const { videoMinutes } = await runPipeline(
      jobId,
      script,
      (progress) => updateCourse(jobId, { progress }),
    );

    await debitGenerationCredits(userId, script, videoMinutes, jobId);

    await updateCourse(jobId, {
      status:   "done",
      progress: 100,
      result:   `/videos/${jobId}.mp4`,
    });
  } catch (err) {
    await updateCourse(jobId, {
      status:       "error",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

// ─── Video job ────────────────────────────────────────────────────────────────

export async function runVideoJob(
  jobId: string,
  script: string,
  userId: string,
): Promise<void> {
  const allowed = await hasAccess(userId, "studio");
  if (!allowed) {
    await updateVideo(jobId, {
      status:       "error",
      errorMessage: "Access denied — user does not have studio access",
    });
    return;
  }

  try {
    await updateVideo(jobId, { status: "processing", progress: 10 });

    const { videoMinutes } = await runPipeline(
      jobId,
      script,
      (progress) => updateVideo(jobId, { progress }),
    );

    await debitGenerationCredits(userId, script, videoMinutes, jobId);

    await updateVideo(jobId, {
      status:    "done",
      progress:  100,
      outputUrl: `/videos/${jobId}.mp4`,
    });
  } catch (err) {
    await updateVideo(jobId, {
      status:       "error",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

// ─── Image generation job ─────────────────────────────────────────────────────
// Called from a background queue or API route when an image generation is requested.
// The tRPC router creates the DB record and returns immediately;
// this function runs the actual generation and updates the record.

export async function runImageGenerationJob(
  recordId: string,
  userId: string,
): Promise<void> {
  const allowed = await hasAccess(userId, "studio");
  if (!allowed) {
    await prisma.imageGeneration.update({
      where: { id: recordId },
      data:  { status: "FAILED", errorMessage: "Access denied" },
    });
    return;
  }

  const record = await prisma.imageGeneration.findUnique({
    where: { id: recordId },
  });
  if (!record) return;

  try {
    await prisma.imageGeneration.update({
      where: { id: recordId },
      data:  { status: "PROCESSING" },
    });

    // TODO: replace with actual image generation call
    // const styledPrompt = buildStyledPrompt(
    //   record.prompt,
    //   (record.style ?? "photojournalistic") as Parameters<typeof buildStyledPrompt>[1],
    // );
    // const result = await imageClient.generate({ prompt: styledPrompt, width: record.width, height: record.height });
    // const key    = `image-generations/orgs/${record.orgId}/${recordId}.jpg`;
    // await uploadImage({ buffer: result.buffer, key });
    // const outputUrl = `${env.R2_PUBLIC_URL}/${key}`;
    const outputUrl: string | null = null; // placeholder

    await prisma.imageGeneration.update({
      where: { id: recordId },
      data:  { status: "COMPLETED", outputUrl },
    });

    // Write polymorphic UsageRecord
    await prisma.usageRecord.create({
      data: {
        orgId:             record.orgId,
        imageGenerationId: recordId,
        imagesUsed:        1,
        month:             new Date().getMonth() + 1,
        year:              new Date().getFullYear(),
      },
    });

    // Debit platform credits
    await debit({
      userId,
      app:       "studio",
      eventType: "image_generated",
      amount:    1,
      meta:      { recordId, style: record.style ?? "photojournalistic" },
    });

  } catch (err) {
    await prisma.imageGeneration.update({
      where: { id: recordId },
      data:  {
        status:       "FAILED",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
  }
}

// ─── Text generation job ──────────────────────────────────────────────────────
// Same async job pattern as image generation above.

export async function runTextGenerationJob(
  recordId: string,
  userId: string,
): Promise<void> {
  const allowed = await hasAccess(userId, "studio");
  if (!allowed) {
    await prisma.textGeneration.update({
      where: { id: recordId },
      data:  { status: "FAILED", errorMessage: "Access denied" },
    });
    return;
  }

  const record = await prisma.textGeneration.findUnique({
    where: { id: recordId },
  });
  if (!record) return;

  const type = record.type as Parameters<typeof systemPrompt>[0];

  try {
    await prisma.textGeneration.update({
      where: { id: recordId },
      data:  { status: "PROCESSING" },
    });

    // TODO: replace with actual LLM call
    // const response = await anthropic.messages.create({
    //   model:    "claude-opus-4-6",
    //   max_tokens: maxOutputTokens(type),
    //   system:   systemPrompt(type),
    //   messages: [{ role: "user", content: record.prompt }],
    // });
    // const output     = response.content[0].type === "text" ? response.content[0].text : null;
    // const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;
    const output: string | null = null;    // placeholder
    const tokensUsed: number    = 0;       // placeholder

    await prisma.textGeneration.update({
      where: { id: recordId },
      data:  { status: "COMPLETED", output, tokensUsed },
    });

    await prisma.usageRecord.create({
      data: {
        orgId:            record.orgId,
        textGenerationId: recordId,
        tokensUsed,
        month:            new Date().getMonth() + 1,
        year:             new Date().getFullYear(),
      },
    });

    await debit({
      userId,
      app:       "studio",
      eventType: "text_generated",
      amount:    Math.ceil(tokensUsed / 1000), // debit per 1k tokens
      meta:      { recordId, type, tokensUsed: String(tokensUsed) },
    });

  } catch (err) {
    await prisma.textGeneration.update({
      where: { id: recordId },
      data:  {
        status:       "FAILED",
        errorMessage: err instanceof Error ? err.message : "Unknown error",
      },
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ttsCreditCost(script: string): number {
  return Math.ceil((script.length / 1000) * 10);
}
