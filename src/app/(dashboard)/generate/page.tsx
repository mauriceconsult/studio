"use client";
import { useState } from "react";

export default function GeneratePage() {
  const [script, setScript] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    setVideoUrl(null);
    const res = await fetch("/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ script }),
    });
    const { url } = await res.json();
    setVideoUrl(url);
    setLoading(false);
  }

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-4">
      <textarea
        className="w-full border rounded p-3 h-40 text-sm"
        placeholder="Paste your tutorial script…"
        value={script}
        onChange={(e) => setScript(e.target.value)}
      />
      <button
        onClick={handleGenerate}
        disabled={loading || !script}
        className="bg-black text-white px-5 py-2 rounded disabled:opacity-40"
      >
        {loading ? "Generating…" : "Generate tutorial"}
      </button>
      {videoUrl && (
        <video src={videoUrl} controls className="w-full rounded mt-4" />
      )}
    </main>
  );
}
