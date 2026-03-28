export async function generateTTS(script: string): Promise<Buffer> {
  if (!process.env.TTS_API_URL) throw new Error("TTS_API_URL is not defined");
  if (!process.env.TTS_API_KEY) throw new Error("TTS_API_KEY is not defined");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 2min — GPU cold start

  try {
    const res = await fetch(process.env.TTS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.TTS_API_KEY,
      },
      body: JSON.stringify({
        prompt: script,
        voice_key: process.env.TTS_VOICE_KEY ?? "voices/system/default.wav",
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ TTS ERROR:", { status: res.status, body: errorText });
      throw new Error(`TTS failed: ${res.status}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("TTS request timed out");
    }
    console.error("❌ TTS FATAL ERROR:", err);
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
