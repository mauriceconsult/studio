import path from "path";
import { writeFile } from "fs/promises";
import { generateTTS } from "@/lib/tts";
import { composeVideo } from "@/lib/ffmpeg";
import { splitScript, toSRT } from "@/lib/segment";
import { updateJob } from "./job";


const OUT_DIR = path.join(process.cwd(), "public", "videos");

export async function runCourseJob(jobId: string, script: string) {
  try {
    updateJob(jobId, { status: "processing", progress: 10 });

    const audioPath = path.join(OUT_DIR, `${jobId}.wav`);
    const srtPath = path.join(OUT_DIR, `${jobId}.srt`);
    const videoPath = path.join(OUT_DIR, `${jobId}.mp4`);

    // 1. TTS
    const audioBuffer = await generateTTS(script);
    await writeFile(audioPath, audioBuffer);
    updateJob(jobId, { progress: 40 });

    // 2. Subtitles
    const segments = splitScript(script);
    await writeFile(srtPath, toSRT(segments));
    updateJob(jobId, { progress: 60 });

    // 3. Images (placeholder)
    const imagePaths = segments.map(() =>
      path.join(process.cwd(), "public", "slides", "default.png"),
    );

    // 4. Video
    await composeVideo({
      audioPath,
      imagePaths,
      srtPath,
      outputPath: videoPath,
    });

    updateJob(jobId, {
      status: "done",
      progress: 100,
      result: `/videos/${jobId}.mp4`,
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    updateJob(jobId, {
      status: "error",
      result: errorMessage,
    });
  }
}
