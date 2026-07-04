import { getTextProvider } from "./registry";
import type { GenerateTextInput } from "./types";

export const ai = {
  async generateText(input: GenerateTextInput) {
    return getTextProvider().generateText(input);
  },
};
