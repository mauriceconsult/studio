import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { generateTTS } from "@/lib/tts";
import { composeVideo } from "@/lib/ffmpeg";
import { splitScript, toSRT } from "@/lib/segment";

const OUT_DIR = path.join(process.cwd(), "public", "videos");

export async function POST(req: NextRequest) {
  let body;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid or empty JSON body" },
      { status: 400 },
    );
  }

  const { script, jobId } = body;

  if (!script) {
    return NextResponse.json({ error: "script required" }, { status: 400 });
  }

  const id = jobId ?? crypto.randomUUID();
  const audioPath = path.join(OUT_DIR, `${id}.wav`);
  const srtPath = path.join(OUT_DIR, `${id}.srt`);
  const videoPath = path.join(OUT_DIR, `${id}.mp4`);

  // 1 — TTS
  const audioBuffer = await generateTTS(script);
  await writeFile(audioPath, audioBuffer);

  // 2 — Timing + subtitles
  const segments = splitScript(script);
  await writeFile(srtPath, toSRT(segments));

  // 3 — Visuals: use a static brand image per segment (swap for real screenshots)
  const imagePaths = segments.map(() =>
    path.join(process.cwd(), "public", "slides", "default.png"),
  );

  // 4 — Compose
  await composeVideo({ audioPath, imagePaths, srtPath, outputPath: videoPath });

  return NextResponse.json({ id, url: `/videos/${id}.mp4` });
}
