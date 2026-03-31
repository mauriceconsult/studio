import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { generateTTS } from "@/lib/tts";
import { composeVideo } from "@/lib/ffmpeg";
import { splitScript, toSRT } from "@/lib/segment";
import { updateJob } from "./job";
import { debit, hasAccess } from "@/lib/platform";

const OUT_DIR = path.join(process.cwd(), "public", "videos");

export async function runCourseJob(
  jobId: string,
  script: string,
  userId: string,        // ← now required
) {
  try {
    // 0. Guard — ensure output directory exists
    await mkdir(OUT_DIR, { recursive: true });

    // 1. Access check — fail fast before any compute
    const allowed = await hasAccess(userId, "studio");
    if (!allowed) {
      await updateJob(jobId, {
        status: "error",
        result: "Access denied — user does not have studio access",
      });
      return;
    }

    await updateJob(jobId, { status: "processing", progress: 10 });

    const audioPath = path.join(OUT_DIR, `${jobId}.wav`);
    const srtPath   = path.join(OUT_DIR, `${jobId}.srt`);
    const videoPath = path.join(OUT_DIR, `${jobId}.mp4`);

    // 2. TTS
    const audioBuffer = await generateTTS(script);
    await writeFile(audioPath, audioBuffer);
    await updateJob(jobId, { progress: 30 });

    // 3. Subtitles
    const segments = splitScript(script);
    await writeFile(srtPath, toSRT(segments));
    await updateJob(jobId, { progress: 50 });

    // 4. Images (placeholder — replace with real slide generation)
    const imagePaths = segments.map(() =>
      path.join(process.cwd(), "public", "slides", "default.png"),
    );
    await updateJob(jobId, { progress: 65 });

    // 5. Video composition
    await composeVideo({
      audioPath,
      imagePaths,
      srtPath,
      outputPath: videoPath,
    });
    await updateJob(jobId, { progress: 90 });

    // 6. Debit credits only after successful completion
    await debit({
      userId,
      app: "studio",
      eventType: "tts_generation",
      amount: scriptCreditCost(script),
      meta: { jobId },
    });

    await updateJob(jobId, {
      status: "done",
      progress: 100,
      result: `/videos/${jobId}.mp4`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await updateJob(jobId, {
      status: "error",
      result: errorMessage,
    });
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Calculate credit cost from script length.
 * Mirrors the TTS pricing: 10 credits per 1,000 characters.
 */
function scriptCreditCost(script: string): number {
  return Math.ceil((script.length / 1000) * 10);
}
