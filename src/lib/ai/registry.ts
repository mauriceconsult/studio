import { anthropicProvider } from "./providers/anthropic";
import type { TextGenerationProvider } from "./types";

export function getTextProvider(): TextGenerationProvider {
  switch (process.env.AI_PROVIDER) {
    case "anthropic":
    default:
      return anthropicProvider;
  }
}
