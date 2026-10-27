"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Scene = {
  id: string;
  position: number;
  startMs: number;
  endMs: number;
  section: string | null;
  lyricsText: string | null;
  visualPrompt: string | null;
  status: string;
  assetUrl: string | null;
  clipGenerationId: string | null;
};

type Render = {
  id: string;
  status: string;
  errorMessage: string | null;
  videoUrl: string | null;
};

type Project = {
  id: string;
  title: string;
  lyrics: string | null;
  aspectRatio: string;
  status: string;
  visualStyle: string | null;
  audioUrl: string;
  audioAsset: { durationMs: number | null; name: string | null };
  scenes: Scene[];
  renders: Render[];
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: unknown })
    | null;
  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "Request failed",
    );
  }
  if (!data) throw new Error("The server returned an invalid response");
  return data;
}

function formatTime(ms: number) {
  return `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, "0")}`;
}

export function MusicVideoEditor({ id }: { id: string }) {
  const [project, setProject] = useState<Project | null>(null);
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      let updated = await requestJson<Project>(`/api/music-videos/${id}`, {
        cache: "no-store",
      });
      const inFlight = updated.scenes.filter(
        (scene) => scene.clipGenerationId && scene.status === "PENDING",
      );
      if (inFlight.length) {
        await Promise.all(
          inFlight.map((scene) =>
            fetch(`/api/clips/${scene.clipGenerationId}`, { cache: "no-store" }).catch(
              () => undefined,
            ),
          ),
        );
        updated = await requestJson<Project>(`/api/music-videos/${id}`, {
          cache: "no-store",
        });
      }
      setProject(updated);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load project");
    } finally {
      busyRef.current = false;
    }
  }, [id]);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 6000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function action(
    name: string,
    url: string,
    init?: RequestInit,
    successMessage?: string,
  ) {
    setBusy(name);
    setError(null);
    try {
      await requestJson(url, init);
      if (successMessage) setError(successMessage);
      await refresh();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Action failed");
    } finally {
      setBusy(null);
    }
  }

  async function savePrompt(scene: Scene) {
    const current = project?.scenes.find((item) => item.id === scene.id);
    if (!current || current.visualPrompt === scene.visualPrompt) return;
    await action(
      `save-${scene.id}`,
      `/api/music-videos/${id}/scenes/${scene.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visualPrompt: scene.visualPrompt ?? "" }),
      },
    );
  }

  async function generateImage(scene: Scene) {
    await action(
      `image-${scene.id}`,
      `/api/music-videos/${id}/scenes/${scene.id}/image`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    );
  }

  async function generateClip(scene: Scene) {
    const seconds = Math.max(
      3,
      Math.min(10, Math.round((scene.endMs - scene.startMs) / 1000)),
    );
    await action(
      `clip-${scene.id}`,
      "/api/clips",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneId: scene.id,
          durationSeconds: seconds,
        }),
      },
      "Video clip queued. This page checks its progress automatically.",
    );
  }

  if (!project) {
    return (
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        {error ? (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Loading music video…</p>
        )}
      </main>
    );
  }

  const audioDuration = project.audioAsset.durationMs ?? 0;
  const latestRender = project.renders[0];
  const readyToRender =
    project.scenes.length > 0 &&
    project.scenes.every((scene) => scene.status === "COMPLETED" && scene.assetUrl) &&
    project.scenes[0]?.startMs === 0 &&
    project.scenes.at(-1)?.endMs === audioDuration &&
    project.scenes.every(
      (scene, index, scenes) =>
        index === 0 || scenes[index - 1]?.endMs === scene.startMs,
    );

  return (
    <main className="flex-1 space-y-6 overflow-y-auto p-4 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/music-videos" className="text-xs text-muted-foreground underline">
            Music videos
          </Link>
          <h1 className="mt-2 text-2xl font-semibold">{project.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {project.status} · {project.aspectRatio} ·{" "}
            {audioDuration ? `${Math.round(audioDuration / 1000)} seconds` : "unknown audio length"}
          </p>
        </div>
        <button
          type="button"
          disabled={!readyToRender || project.status === "RENDERING" || busy !== null}
          onClick={() =>
            void action(
              "render",
              `/api/music-videos/${id}/render`,
              { method: "POST" },
              "Render queued. Keep the music-video worker running to finish it.",
            )
          }
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy === "render" || project.status === "RENDERING"
            ? "Rendering…"
            : "Render music video"}
        </button>
      </div>

      {error && (
        <p role="status" className="rounded-md border p-3 text-sm">
          {error}
        </p>
      )}

      <section className="grid gap-5 rounded-xl border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:p-6">
        <div className="space-y-3">
          <h2 className="font-semibold">Source song</h2>
          <audio controls preload="none" src={project.audioUrl} className="w-full" />
          {project.lyrics && (
            <details>
              <summary className="cursor-pointer text-sm">Lyrics</summary>
              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap font-sans text-sm">
                {project.lyrics}
              </pre>
            </details>
          )}
        </div>
        <div className="space-y-3">
          <h2 className="font-semibold">Scene setup</h2>
          <p className="text-sm text-muted-foreground">
            Split lyrics into timed scenes, create consistent visual prompts,
            generate each scene’s visual, then render the video.
          </p>
          <label className="block space-y-1 text-sm">
            Visual direction (optional)
            <textarea
              value={brief}
              maxLength={500}
              onChange={(event) => setBrief(event.target.value)}
              rows={2}
              placeholder="Mood, color palette, location, or other direction"
              className="w-full rounded-md border bg-background p-2"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== null || project.status !== "DRAFT" || !project.lyrics}
              onClick={() =>
                void action(
                  "split",
                  `/api/music-videos/${id}/scenes/split`,
                  { method: "POST" },
                )
              }
              className="h-9 rounded-md border px-3 text-sm disabled:opacity-50"
            >
              {busy === "split" ? "Splitting…" : "Split lyrics into scenes"}
            </button>
            <button
              type="button"
              disabled={busy !== null || project.status !== "DRAFT" || !project.scenes.length}
              onClick={() =>
                void action(
                  "prompts",
                  `/api/music-videos/${id}/scenes/prompts`,
                  {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ brief, overwrite: false }),
                  },
                )
              }
              className="h-9 rounded-md border px-3 text-sm disabled:opacity-50"
            >
              {busy === "prompts" ? "Writing prompts…" : "Generate scene prompts"}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Scenes ({project.scenes.length})</h2>
          <span className="text-xs text-muted-foreground">
            {readyToRender ? "Ready to render" : "Complete every scene visual to render"}
          </span>
        </div>
        {project.scenes.length === 0 && (
          <p className="rounded-xl border p-5 text-sm text-muted-foreground">
            Split the project lyrics to create timed scenes.
          </p>
        )}
        {project.scenes.map((scene) => (
          <article key={scene.id} className="grid gap-4 rounded-xl border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.8fr)]">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-medium">
                  Scene {scene.position + 1}
                  {scene.section ? ` · ${scene.section}` : ""}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {formatTime(scene.startMs)}–{formatTime(scene.endMs)}
                </span>
              </div>
              {scene.lyricsText && (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {scene.lyricsText}
                </p>
              )}
              <label className="block space-y-1 text-xs font-medium">
                Visual prompt
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={scene.visualPrompt ?? ""}
                  disabled={project.status !== "DRAFT"}
                  onChange={(event) => {
                    const visualPrompt = event.target.value;
                    setProject((current) =>
                      current
                        ? {
                            ...current,
                            scenes: current.scenes.map((item) =>
                              item.id === scene.id ? { ...item, visualPrompt } : item,
                            ),
                          }
                        : current,
                    );
                  }}
                  onBlur={() => void savePrompt(scene)}
                  placeholder="Generate prompts above or describe the scene."
                  className="w-full rounded-md border bg-background p-2 text-sm font-normal"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy !== null || project.status !== "DRAFT" || !scene.visualPrompt?.trim()}
                  onClick={() => void generateImage(scene)}
                  className="h-9 rounded-md border px-3 text-sm disabled:opacity-50"
                >
                  {busy === `image-${scene.id}` ? "Generating image…" : "Generate image"}
                </button>
                <button
                  type="button"
                  disabled={busy !== null || project.status !== "DRAFT" || !scene.visualPrompt?.trim()}
                  onClick={() => void generateClip(scene)}
                  className="h-9 rounded-md border px-3 text-sm disabled:opacity-50"
                >
                  {busy === `clip-${scene.id}` ? "Submitting…" : "Generate video clip"}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                Visual status: {scene.status}
                {scene.status === "PENDING" ? " · updating automatically" : ""}
              </p>
            </div>
            <div className="flex min-h-40 items-center justify-center overflow-hidden rounded-lg bg-muted">
              {scene.assetUrl ? (
                <img
                  src={scene.assetUrl}
                  alt={`Visual for scene ${scene.position + 1}`}
                  className="max-h-80 w-full object-contain"
                />
              ) : (
                <span className="p-4 text-center text-sm text-muted-foreground">
                  No visual generated yet
                </span>
              )}
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Renders</h2>
        {project.renders.length === 0 && (
          <p className="text-sm text-muted-foreground">No renders yet.</p>
        )}
        {project.renders.map((render) => (
          <article key={render.id} className="space-y-2 rounded-xl border p-4">
            <p className="text-sm font-medium">{render.status}</p>
            {render.errorMessage && (
              <p role="alert" className="text-sm text-destructive">{render.errorMessage}</p>
            )}
            {render.videoUrl && (
              <video controls preload="none" src={render.videoUrl} className="w-full rounded-lg" />
            )}
            {(render.status === "PENDING" || render.status === "PROCESSING") && (
              <p className="text-xs text-muted-foreground">Render status refreshes automatically.</p>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
