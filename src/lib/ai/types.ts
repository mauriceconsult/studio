import { TextGenerationType } from "../ai-types";

export interface GenerateTextInput {
  type: TextGenerationType;
  prompt: string;
}

export interface GenerateTextResult {
  output: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface TextGenerationProvider {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
}
