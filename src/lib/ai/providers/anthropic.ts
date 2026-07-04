import Anthropic from "@anthropic-ai/sdk"; // default import — matches SDK's export
import type {
  TextGenerationProvider,
  GenerateTextInput,
  GenerateTextResult,
} from "../types";
import {
  systemPrompt,
  maxOutputTokens,
} from "@/trpc/routers/text-generations-router";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // SDK reads this automatically if omitted,
}); // but explicit is fine

// Override per generation type in .env if needed:
// ANTHROPIC_MODEL=claude-sonnet-4-6
const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

export const anthropicProvider: TextGenerationProvider = {
  async generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
    const response = await anthropic.messages.create({
      model: MODEL,
      system: systemPrompt(input.type),
      max_tokens: maxOutputTokens(input.type),
      messages: [{ role: "user", content: input.prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return {
      output: text,
      provider: "anthropic",
      model: response.model,
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens: response.usage.input_tokens + response.usage.output_tokens,
    };
  },
};
