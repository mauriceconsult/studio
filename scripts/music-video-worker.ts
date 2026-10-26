import { runMusicVideoRenderWorker } from "../src/lib/music-video/render-worker";

const controller = new AbortController();
process.once("SIGINT", () => controller.abort());
process.once("SIGTERM", () => controller.abort());

runMusicVideoRenderWorker(controller.signal)
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(
      "Music video worker stopped:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  });
