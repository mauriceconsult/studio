"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

type Song = {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  lyrics: string;
  stylePrompt: string | null;
  language: string;
  tempoBpm: number | null;
  durationSeconds: number | null;
  targetDurationSeconds: number | null;
  errorMessage: string | null;
  createdAt: string;
  assetId: string | null;
  audioUrl: string | null;
  quote: { priceUgx: number; priceUsd: number; rail: string } | null;
};

async function readJson<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: unknown })
    | null;
  if (!response.ok) {
    const message =
      typeof data?.error === "string" ? data.error : "Request failed";
    throw new Error(message);
  }
  if (!data) throw new Error("The server returned an invalid response");
  return data;
}

export function SongsView({
  initialLyrics,
  initialTitle,
}: {
  initialLyrics: string;
  initialTitle: string;
}) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [lyrics, setLyrics] = useState(initialLyrics);
  const [stylePrompt, setStylePrompt] = useState("");
  const [language, setLanguage] = useState("en");
  const [tempo, setTempo] = useState("");
  const [duration, setDuration] = useState("120");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      let updated = await readJson<Song[]>(await fetch("/api/songs", { cache: "no-store" }));
      const active = updated.filter(
        (song) => song.status === "PENDING" || song.status === "PROCESSING",
      );
      if (active.length) {
        await Promise.all(
          active.map((song) =>
            fetch(`/api/songs/${song.id}`, { cache: "no-store" }).catch(
              () => undefined,
            ),
          ),
        );
        updated = await readJson<Song[]>(
          await fetch("/api/songs", { cache: "no-store" }),
        );
      }
      setSongs(updated);
      setError(null);
    } catch (refreshError) {
      setError(
        refreshError instanceof Error
          ? refreshError.message
          : "Could not load songs",
      );
    } finally {
      setLoading(false);
      busyRef.current = false;
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = setInterval(() => void refresh(), 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await readJson(
        await fetch("/api/songs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lyrics,
            stylePrompt: stylePrompt || undefined,
            language,
            tempoBpm: tempo ? Number(tempo) : undefined,
            durationSeconds: Number(duration),
            sourceApp: "studio",
          }),
        }),
      );
      setLyrics("");
      setStylePrompt("");
      await refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not start song generation",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex-1 space-y-8 overflow-y-auto p-4 lg:p-8">
      <header>
        <h1 className="text-2xl font-semibold">Song generation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Turn your lyrics into an original song, then use it to create a music
          video.
        </p>
      </header>

      <form onSubmit={submit} className="space-y-4 rounded-xl border p-4 lg:p-6">
        <div>
          <label htmlFor="song-lyrics" className="mb-1 block text-sm font-medium">
            Lyrics
          </label>
          <textarea
            id="song-lyrics"
            required
            minLength={1}
            maxLength={4096}
            rows={10}
            value={lyrics}
            onChange={(event) => setLyrics(event.target.value)}
            placeholder={"[Verse]\nWrite your lyrics here...\n\n[Chorus]\n"}
            className="w-full resize-y rounded-md border bg-background p-3 text-sm"
          />
          <p className="mt-1 text-right text-xs text-muted-foreground">
            {lyrics.length}/4096
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="space-y-1 text-sm font-medium">
            Style
            <input
              value={stylePrompt}
              maxLength={300}
              onChange={(event) => setStylePrompt(event.target.value)}
              placeholder="Afrobeat, warm guitar, uplifting"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            Language
            <input
              required
              minLength={2}
              maxLength={40}
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            Tempo (BPM)
            <input
              type="number"
              min={30}
              max={300}
              value={tempo}
              onChange={(event) => setTempo(event.target.value)}
              placeholder="Optional"
              className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
            />
          </label>
          <label className="space-y-1 text-sm font-medium">
            Target duration (seconds)
            <input
              type="number"
              min={10}
              max={600}
              required
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm font-normal"
            />
          </label>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || lyrics.trim().length === 0}
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Generate song"}
        </button>
      </form>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent songs</h2>
          {loading && <span className="text-xs text-muted-foreground">Loading…</span>}
        </div>
        {error && songs.length > 0 && (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        )}
        {!loading && songs.length === 0 && (
          <p className="rounded-xl border p-6 text-sm text-muted-foreground">
            No songs yet. Add lyrics above to create your first song.
          </p>
        )}
        <div className="space-y-3">
          {songs.map((song) => (
            <article key={song.id} className="space-y-3 rounded-xl border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">
                    {song.stylePrompt || "Generated song"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {song.language}
                    {song.durationSeconds
                      ? ` · ${Math.round(song.durationSeconds)} sec`
                      : song.targetDurationSeconds
                        ? ` · target ${song.targetDurationSeconds} sec`
                        : ""}
                    {song.quote ? ` · ${song.quote.priceUgx.toLocaleString()} UGX` : ""}
                  </p>
                </div>
                <span className="text-xs font-medium">{song.status}</span>
              </div>
              {song.status === "PENDING" || song.status === "PROCESSING" ? (
                <p className="text-sm text-muted-foreground">
                  Song is generating. This list updates automatically.
                </p>
              ) : null}
              {song.status === "FAILED" && (
                <p role="alert" className="text-sm text-destructive">
                  {song.errorMessage || "Song generation failed."}
                </p>
              )}
              {song.audioUrl && (
                <audio controls preload="none" src={song.audioUrl} className="w-full" />
              )}
              <details>
                <summary className="cursor-pointer text-xs text-muted-foreground">
                  View lyrics
                </summary>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-sm">
                  {song.lyrics}
                </pre>
              </details>
              {song.status === "COMPLETED" && song.assetId && (
                <Link
                  href={`/music-videos?songId=${encodeURIComponent(song.id)}${initialTitle ? `&title=${encodeURIComponent(initialTitle)}` : ""}`}
                  className="inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium hover:bg-muted"
                >
                  Create music video
                </Link>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
