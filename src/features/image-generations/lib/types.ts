// features/image-generations/lib/types.ts
// Single source of truth for the ImageGeneration shape used across all components.
// Derived from the Prisma model — update here if the schema changes.

export type ImageGenerationDetail = {
  id: string;
  prompt: string;
  style: string | null;
  status: string;
  outputUrl: string | null;
  sourceApp: string;
  sourceEntityId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ImageGenerationListItem = Pick<
  ImageGenerationDetail,
  "id" | "prompt" | "style" | "status" | "outputUrl" | "createdAt"
>;

export type ImageStyle =
  | "photojournalistic"
  | "editorial"
  | "documentary"
  | "portrait";

export const IMAGE_STYLES: { value: ImageStyle; label: string }[] = [
  { value: "photojournalistic", label: "Photojournalistic" },
  { value: "editorial", label: "Editorial" },
  { value: "documentary", label: "Documentary" },
  { value: "portrait", label: "Portrait" },
];
