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
