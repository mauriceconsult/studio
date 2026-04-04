import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { generateTTS } from "@/lib/tts";
import { composeVideo } from "@/lib/ffmpeg";
import { splitScript, toSRT } from "@/lib/segment";
import { debit, hasAccess } from "@/lib/platform";
import { prisma } from "@/lib/db";

const OUT_DIR       = path.join(process.cwd(), "public", "videos");
const execFileAsync = promisify(execFile);

// ─── Prisma job update helpers ────────────────────────────────────────────────

type JobUpdate = {
  status?: "pending" | "processing" | "done" | "error";
  progress?: number;
  result?: string;
  errorMessage?: string;
};

async function updateCourse(id: string, data: JobUpdate) {
  const { result, ...rest } = data;
  await prisma.course.update({
    where: { id },
    data: {
      ...rest,
      ...(result !== undefined ? { result: { output: result } } : {}),
    },
  });
}

async function updateVideo(id: string, data: JobUpdate & { outputUrl?: string }) {
  const { outputUrl, ...rest } = data;
  await prisma.video.update({
    where: { id },
    data: {
      ...rest,
      ...(outputUrl !== undefined ? { outputUrl } : {}),
    },
  });
}

// ─── Video duration via ffprobe ───────────────────────────────────────────────

/**
 * Returns the duration of a video file in whole minutes (ceiling).
 * Requires ffprobe to be available in PATH (bundled with ffmpeg).
 * Falls back to 1 minute if ffprobe fails — never bills zero.
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

// ─── Course job runner ────────────────────────────────────────────────────────

export async function runCourseJob(
  jobId: string,
  script: string,
  userId: string,
) {
  try {
    await mkdir(OUT_DIR, { recursive: true });

    const allowed = await hasAccess(userId, "studio");
    if (!allowed) {
      await updateCourse(jobId, {
        status: "error",
        errorMessage: "Access denied — user does not have studio access",
      });
      return;
    }

    await updateCourse(jobId, { status: "processing", progress: 10 });

    const audioPath = path.join(OUT_DIR, `${jobId}.wav`);
    const srtPath   = path.join(OUT_DIR, `${jobId}.srt`);
    const videoPath = path.join(OUT_DIR, `${jobId}.mp4`);

    // TTS
    const audioBuffer = await generateTTS(script);
    await writeFile(audioPath, audioBuffer);
    await updateCourse(jobId, { progress: 30 });

    // Subtitles
    const segments = splitScript(script);
    await writeFile(srtPath, toSRT(segments));
    await updateCourse(jobId, { progress: 50 });

    // Images (placeholder — replace with real slide generation)
    const imagePaths = segments.map(() =>
      path.join(process.cwd(), "public", "slides", "default.png"),
    );
    await updateCourse(jobId, { progress: 65 });

    // Video composition
    await composeVideo({ audioPath, imagePaths, srtPath, outputPath: videoPath });
    await updateCourse(jobId, { progress: 85 });

    // Measure actual video duration
    const videoMinutes = await getVideoMinutes(videoPath);

    // Debit credits after successful completion
    await debit({
      userId,
      app:       "studio",
      eventType: "characters_synthesized",
      amount:    ttsCreditCost(script),
      meta:      { jobId },
    });

    await debit({
      userId,
      app:       "studio",
      eventType: "video_minutes",
      amount:    videoMinutes,
      meta:      { jobId, videoMinutes: String(videoMinutes) },
    });

    await updateCourse(jobId, {
      status:   "done",
      progress: 100,
      result:   `/videos/${jobId}.mp4`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await updateCourse(jobId, { status: "error", errorMessage });
  }
}

// ─── Video job runner ─────────────────────────────────────────────────────────

export async function runVideoJob(
  jobId: string,
  script: string,
  userId: string,
) {
  try {
    await mkdir(OUT_DIR, { recursive: true });

    const allowed = await hasAccess(userId, "studio");
    if (!allowed) {
      await updateVideo(jobId, {
        status: "error",
        errorMessage: "Access denied — user does not have studio access",
      });
      return;
    }

    await updateVideo(jobId, { status: "processing", progress: 10 });

    const audioPath = path.join(OUT_DIR, `${jobId}.wav`);
    const srtPath   = path.join(OUT_DIR, `${jobId}.srt`);
    const videoPath = path.join(OUT_DIR, `${jobId}.mp4`);

    const audioBuffer = await generateTTS(script);
    await writeFile(audioPath, audioBuffer);
    await updateVideo(jobId, { progress: 30 });

    const segments = splitScript(script);
    await writeFile(srtPath, toSRT(segments));
    await updateVideo(jobId, { progress: 50 });

    const imagePaths = segments.map(() =>
      path.join(process.cwd(), "public", "slides", "default.png"),
    );
    await updateVideo(jobId, { progress: 65 });

    await composeVideo({ audioPath, imagePaths, srtPath, outputPath: videoPath });
    await updateVideo(jobId, { progress: 85 });

    const videoMinutes = await getVideoMinutes(videoPath);

    await debit({
      userId,
      app:       "studio",
      eventType: "characters_synthesized",
      amount:    ttsCreditCost(script),
      meta:      { jobId },
    });

    await debit({
      userId,
      app:       "studio",
      eventType: "video_minutes",
      amount:    videoMinutes,
      meta:      { jobId, videoMinutes: String(videoMinutes) },
    });

    const outputUrl = `/videos/${jobId}.mp4`;

    await updateVideo(jobId, {
      status:    "done",
      progress:  100,
      outputUrl,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await updateVideo(jobId, { status: "error", errorMessage });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ttsCreditCost(script: string): number {
  return Math.ceil((script.length / 1000) * 10);
}
