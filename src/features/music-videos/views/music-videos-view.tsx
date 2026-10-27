"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type SongChoice = {
  id: string;
  status: string;
  lyrics: string;
  assetId: string | null;
};

type Project = {
  id: string;
  title: string;
  status: string;
  aspectRatio: string;
  createdAt: string;
  audioAsset: { name: string | null; durationMs: number | null };
  _count: { scenes: number; renders: number };
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

export function MusicVideosView({
  initialSongId,
  initialTitle,
}: {
  initialSongId: string;
  initialTitle: string;
}) {
  const router = useRouter();
  const [songs, setSongs] = useState<SongChoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [songId, setSongId] = useState(initialSongId);
  const [title, setTitle] = useState(initialTitle);
  const [lyrics, setLyrics] = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [songList, projectList] = await Promise.all([
        requestJson<SongChoice[]>("/api/songs", { cache: "no-store" }),
        requestJson<Project[]>("/api/music-videos", { cache: "no-store" }),
      ]);
      setSongs(songList.filter((song) => song.status === "COMPLETED" && song.assetId));
      setProjects(projectList);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 8000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const selected = songs.find((song) => song.id === songId);
    if (selected) setLyrics(selected.lyrics);
  }, [songId, songs]);

  async function createProject(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selected = songs.find((song) => song.id === songId);
    if (!selected?.assetId) {
      setError("Choose a completed song with an audio file.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const project = await requestJson<{ id: string }>("/api/music-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          audioAssetId: selected.assetId,
          lyrics: lyrics.trim() || undefined,
          aspectRatio,
        }),
      });
      router.push(`/music-videos/${project.id}`);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 space-y-8 overflow-y-auto p-4 lg:p-8">
      <header>
        <h1 className="text-2xl font-semibold">Music videos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn a generated song into a scene-based video with AI visuals.
        </p>
      </header>

      <form onSubmit={createProject} className="space-y-4 rounded-xl border p-4 lg:p-6">
        <h2 className="text-lg font-semibold">Start a music video</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">
            Project title
            <input
              required
              minLength={1}
              maxLength={120}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="My music video"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            Completed song
            <select
              required
              value={songId}
              onChange={(event) => setSongId(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
            >
              <option value="">Select a generated song</option>
              {songs.map((song) => (
                <option key={song.id} value={song.id}>
                  {song.lyrics.replace(/\s+/g, " ").slice(0, 60) || song.id}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm font-medium">
            Aspect ratio
            <select
              value={aspectRatio}
              onChange={(event) => setAspectRatio(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
            >
              <option value="16:9">Landscape (16:9)</option>
              <option value="9:16">Portrait (9:16)</option>
              <option value="1:1">Square (1:1)</option>
            </select>
          </label>
        </div>
        <label className="block space-y-1 text-sm font-medium">
          Lyrics for scene timing
          <textarea
            maxLength={8000}
            rows={5}
            value={lyrics}
            onChange={(event) => setLyrics(event.target.value)}
            placeholder="Lyrics are prefilled from the selected song. Add or edit them for scene splitting."
            className="w-full rounded-md border bg-background p-3 text-sm font-normal"
          />
        </label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {!loading && songs.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Generate and complete a song first on the{" "}
            <Link href="/songs" className="underline">Songs page</Link>.
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || songs.length === 0}
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create project"}
        </button>
      </form>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your projects</h2>
          {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
        </div>
        {!loading && projects.length === 0 && (
          <p className="rounded-xl border p-6 text-sm text-muted-foreground">
            Your music-video projects will appear here.
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/music-videos/${project.id}`}
              className="space-y-2 rounded-xl border p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium">{project.title}</h3>
                <span className="text-xs text-muted-foreground">{project.status}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {project.audioAsset.name || "Generated song"} · {project.aspectRatio} ·{" "}
                {project._count.scenes} scenes
              </p>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
