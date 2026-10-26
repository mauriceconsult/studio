import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";

const exec = promisify(execFile);

const toFFmpegPath = (p: string) =>
  p.replace(/\\/g, "/").replace(/^([A-Za-z]):/, "$1\\:");

export interface ComposeOptions {
  audioPath: string;
  imagePaths: string[];
  srtPath: string;
  outputPath: string;
}

export async function composeVideo({
  audioPath,
  imagePaths,
  srtPath,
  outputPath,
}: ComposeOptions): Promise<void> {
  const concatFile = `${outputPath}.concat.txt`;

  const lines = [
    ...imagePaths.map((p) => `file '${toFFmpegPath(p)}'\nduration 5`),
    `file '${toFFmpegPath(imagePaths.at(-1)!)}'`,
  ];
  await fs.writeFile(concatFile, lines.join("\n"));

  await exec("ffmpeg", [
    "-y",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    concatFile,
    "-i",
    audioPath,
    "-vf",
    `subtitles=${toFFmpegPath(srtPath)}:force_style='FontSize=22,PrimaryColour=&HFFFFFF'`,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "23",
    "-c:a",
    "aac",
    "-shortest",
    outputPath,
  ]);

  await fs.unlink(concatFile).catch(() => {});
}

export interface MusicVideoSceneInput {
  path: string;
  kind: "IMAGE" | "VIDEO";
  durationSeconds: number;
}

export async function composeMusicVideo({
  audioPath,
  scenes,
  aspectRatio,
  outputPath,
}: {
  audioPath: string;
  scenes: MusicVideoSceneInput[];
  aspectRatio: "16:9" | "9:16" | "1:1";
  outputPath: string;
}): Promise<void> {
  if (scenes.length === 0) throw new Error("Cannot render a video without scenes");

  const [width, height] =
    aspectRatio === "9:16"
      ? [1080, 1920]
      : aspectRatio === "1:1"
        ? [1080, 1080]
        : [1920, 1080];
  const inputArgs: string[] = [];
  for (const scene of scenes) {
    if (scene.kind === "IMAGE") {
      inputArgs.push(
        "-loop",
        "1",
        "-framerate",
        "30",
        "-t",
        String(scene.durationSeconds),
      );
    }
    inputArgs.push("-i", scene.path);
  }
  inputArgs.push("-i", audioPath);

  const filters = scenes.map((scene, index) => {
    const duration = scene.durationSeconds.toFixed(3);
    return `[${index}:v]scale=${width}:${height}:force_original_aspect_ratio=increase,` +
      `crop=${width}:${height},fps=30,setsar=1,trim=duration=${duration},` +
      `setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=${duration},` +
      `trim=duration=${duration}[scene${index}]`;
  });
  filters.push(
    `${scenes.map((_, index) => `[scene${index}]`).join("")}` +
      `concat=n=${scenes.length}:v=1:a=0[vout]`,
  );
  const totalDuration = scenes
    .reduce((total, scene) => total + scene.durationSeconds, 0)
    .toFixed(3);

  await exec("ffmpeg", [
    "-y",
    ...inputArgs,
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[vout]",
    "-map",
    `${scenes.length}:a:0`,
    "-t",
    totalDuration,
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-movflags",
    "+faststart",
    outputPath,
  ]);
}
