export const GENERATION_TYPES = [
  "description",
  "headline",
  "script",
  "captions",
  "body",
  "lyrics",
] as const;

export type TextGenerationType = (typeof GENERATION_TYPES)[number];

export const PROMPT_MAX: Record<TextGenerationType, number> = {
  description: 500,
  headline: 300,
  script: 2000,
  captions: 800,
  body: 1000,
  lyrics: 2000,
};
