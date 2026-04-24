import { parseAsString } from "nuqs/server";

// Search params (used by toolbar + page)
export const textGenerationsSearchParams = {
  query: parseAsString.withDefault(""),
};

// Text type options
export const TEXT_TYPES = [
  { value: "description", label: "Standfirst" },
  { value: "headline",    label: "Headline"   },
  { value: "script",      label: "Script"     },
  { value: "captions",    label: "Captions"   },
  { value: "body",        label: "Body copy"  },
] as const;

export type TextType = (typeof TEXT_TYPES)[number]["value"];

export type GenerationDetail = {
  id:             string;
  type:           string;
  prompt:         string;
  output:         string | null;
  status:         string;
  sourceApp:      string;
  sourceEntityId: string | null;
};
