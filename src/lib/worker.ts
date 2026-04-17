import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { generateTTS } from "@/lib/tts";
import { composeVideo } from "@/lib/ffmpeg";
import { splitScript, toSRT } from "@/lib/segment";
import { debit, hasAccess } from "@/lib/platform";
import { prisma } from "@/lib/db";

const OUT_DIR = path.join(process.cwd(), "public", "videos");
const execFileAsync = promisify(execFile);

// ─── Types ────────────────────────────────────────────────────────────────────

type JobStatus = "pending" | "processing" | "done" | "error";

type JobUpdate = {
  status?: JobStatus;
  progress?: number;
  result?: string;
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

/**
 * Returns the duration of a video file in whole minutes (ceiling).
 * Falls back to 1 to ensure we never bill zero for a completed video.
 */
async function getVideoMinutes(videoPath: string): Promise<number> {
  try {
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      videoPath,
    ]);
    const seconds = parseFloat(stdout.trim());
    if (!isNaN(seconds) && seconds > 0) {
      return Math.ceil(seconds / 60);
    }
  } catch {
    // ffprobe unavailable or file unreadable — bill 1 minute as safe fallback
  }
  return 1;
}

// ─── Shared pipeline ──────────────────────────────────────────────────────────

/**
 * Core generation pipeline shared by both course and video jobs.
 * Returns the output file path and actual video duration in minutes.
 *
 * Callers are responsible for:
 *   - Reporting progress milestones via their own update function
 *   - Debiting credits after this resolves
 */
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

  // TODO: replace with real per-segment slide generation
  const imagePaths = segments.map(() =>
    path.join(process.cwd(), "public", "slides", "default.png"),
  );
  await onProgress(65);

  await composeVideo({ audioPath, imagePaths, srtPath, outputPath: videoPath });
  await onProgress(85);

  const videoMinutes = await getVideoMinutes(videoPath);

  return { videoPath, videoMinutes };
}

/**
 * Debit both TTS characters and video minutes after a successful generation.
 * Both debits are fired regardless of individual failures — catch separately
 * so a billing error doesn't silently suppress the other debit.
 */
async function debitGenerationCredits(
  userId: string,
  script: string,
  videoMinutes: number,
  jobId: string,
): Promise<void> {
  await Promise.allSettled([
    debit({
      userId,
      app: "studio",
      eventType: "characters_synthesized",
      amount: ttsCreditCost(script),
      meta: { jobId },
    }),
    debit({
      userId,
      app: "studio",
      eventType: "video_minutes",
      amount: videoMinutes,
      meta: { jobId, videoMinutes: String(videoMinutes) },
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
      status: "error",
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
      status: "done",
      progress: 100,
      result: `/videos/${jobId}.mp4`,
    });
  } catch (err) {
    await updateCourse(jobId, {
      status: "error",
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
      status: "error",
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
      status: "done",
      progress: 100,
      outputUrl: `/videos/${jobId}.mp4`,
    });
  } catch (err) {
    await updateVideo(jobId, {
      status: "error",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * TTS credit cost in units per 1 000 characters synthesized.
 * 10 units / 1k chars matches the Polar meter rate at time of writing.
 */
function ttsCreditCost(script: string): number {
  return Math.ceil((script.length / 1000) * 10);
}
