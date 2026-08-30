import Anthropic from "@anthropic-ai/sdk";
import type {
  TextGenerationProvider,
  GenerateTextInput,
  GenerateTextResult,
} from "../types";
import {
  systemPrompt,
  maxOutputTokens,
} from "@/trpc/routers/text-generations-router";
import { maxintelProvider } from "./maxintel";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  // SDK-level timeout — ensures fallback fires even on hung requests
  timeout: 60_000,
});

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

// Only fallback on transient / capacity errors.
// Auth failures and permanent errors won't succeed on Maxintel either.
function isRetryableOnFallback(err: unknown): boolean {
  if (err instanceof Anthropic.APIError) {
    // 401 Unauthorized, 403 Forbidden — misconfiguration, not transient
    if (err.status === 401 || err.status === 403) return false;
    // 429 Rate limit, 5xx server errors — transient, worth falling back
    return err.status === 429 || err.status >= 500;
  }
  // Network errors, timeouts — always fallback
  return true;
}

export const anthropicProvider: TextGenerationProvider = {
  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    try {
      const response = await anthropic.messages.create({
        model: MODEL,
        system: systemPrompt(input.type),
        max_tokens: maxOutputTokens(input.type),
        messages: [{ role: "user", content: input.prompt }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        console.warn(
          "[Studio/Anthropic] Response contained no text block:",
          response.content,
        );
      }
      const text = textBlock?.type === "text" ? textBlock.text : "";

      return {
        output: text,
        provider: "anthropic",
        model: response.model,
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      };
    } catch (err) {
      if (!isRetryableOnFallback(err)) {
        // Surface immediately — no point hitting Maxintel for auth failures
        console.error(
          "[Studio/Anthropic] Non-retryable error — not falling back:",
          err,
        );
        throw err;
      }

      console.warn(
        "[Studio/Anthropic] Transient failure, delegating to Maxintel:",
        err,
      );
      return maxintelProvider.generateText(input);
    }
  },
};
