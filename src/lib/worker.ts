import path from "path";
import { mkdir, writeFile } from "fs/promises";
import { execFile } from "child_process";
import { promisify } from "util";
import { generateTTS } from "@/lib/tts";
import { composeVideo } from "@/lib/ffmpeg";
import { splitScript, toSRT } from "@/lib/segment";
import { updateJob } from "./job";
import { debit, hasAccess } from "@/lib/platform";

const OUT_DIR       = path.join(process.cwd(), "public", "videos");
const execFileAsync = promisify(execFile);

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
      return Math.ceil(seconds / 60); // always ceil — never under-bill
    }
  } catch {
    // ffprobe unavailable or file unreadable — bill 1 minute as safe fallback
  }
  return 1;
}

// ─── Main job runner ──────────────────────────────────────────────────────────

export async function runCourseJob(
  jobId:  string,
  script: string,
  userId: string,
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
    await composeVideo({ audioPath, imagePaths, srtPath, outputPath: videoPath });
    await updateJob(jobId, { progress: 85 });

    // 6. Measure actual video duration — must happen after composition
    const videoMinutes = await getVideoMinutes(videoPath);

    // 7. Debit credits only after successful completion — two separate events:
    //    a) TTS characters consumed
    await debit({
      userId,
      app:       "studio",
      eventType: "characters_synthesized",
      amount:    ttsCreditCost(script),
      meta:      { jobId },
    });

    //    b) Video minutes rendered — this is the variable cost unit
    await debit({
      userId,
      app:       "studio",
      eventType: "video_minutes",
      amount:    videoMinutes,
      meta:      { jobId, videoMinutes: String(videoMinutes) },
    });

    await updateJob(jobId, {
      status:   "done",
      progress: 100,
      result:   `/videos/${jobId}.mp4`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await updateJob(jobId, { status: "error", result: errorMessage });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * TTS credit cost by character count.
 * 10 credits per 1,000 characters — mirrors OVERAGE_PRICES.characters_synthesized.
 */
function ttsCreditCost(script: string): number {
  return Math.ceil((script.length / 1000) * 10);
}
