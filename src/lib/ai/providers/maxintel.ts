import type {
  TextGenerationProvider,
  GenerateTextInput,
  GenerateTextResult,
} from "../types";

const MAXINTEL_TIMEOUT_MS = 90_000; // longer than Anthropic — Maxintel makes downstream calls

interface MaxintelGenerateResponse {
  output: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

function isValidResponse(data: unknown): data is MaxintelGenerateResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).output === "string" &&
    typeof (data as Record<string, unknown>).model === "string" &&
    typeof (data as Record<string, unknown>).promptTokens === "number" &&
    typeof (data as Record<string, unknown>).completionTokens === "number" &&
    typeof (data as Record<string, unknown>).totalTokens === "number"
  );
}

export const maxintelProvider: TextGenerationProvider = {
  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    // Read per-call rather than at module load — avoids Next.js env timing edge cases
    const apiUrl = (
      process.env.MAXINTEL_API_URL ?? "https://maxintel.maxnovate.com"
    ).replace(/\/$/, "");
    const apiKey = process.env.PLATFORM_API_KEY;

    if (!apiKey) {
      throw new Error("[Studio/Maxintel] PLATFORM_API_KEY is not configured");
    }

    const res = await fetch(`${apiUrl}/platform/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Platform-Key": apiKey, // matches Maxintel's auth middleware
      },
      body: JSON.stringify({ prompt: input.prompt, type: input.type }),
      signal: AbortSignal.timeout(MAXINTEL_TIMEOUT_MS),
    });

    if (!res.ok) {
      // Don't leak full server body to callers — log it, surface a clean message
      const body = await res.text().catch(() => "(unreadable)");
      console.error(
        `[Studio/Maxintel] ${res.status} from /platform/generate:`,
        body,
      );
      throw new Error(
        `[Studio/Maxintel] Request failed with status ${res.status}`,
      );
    }

    const data: unknown = await res.json();

    if (!isValidResponse(data)) {
      console.error("[Studio/Maxintel] Unexpected response shape:", data);
      throw new Error(
        "[Studio/Maxintel] Response did not match expected schema",
      );
    }

    return {
      output: data.output,
      provider: "maxintel",
      model: data.model,
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens,
      totalTokens: data.totalTokens,
    };
  },
};
