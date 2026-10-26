import { fal } from "@fal-ai/client";
import { z } from "zod";
import { env } from "@/lib/env";

fal.config({ credentials: env.FAL_KEY });
const MODEL = env.STILL_FAL_MODEL;

const resultSchema = z.object({
  images: z
    .array(
      z.object({
        url: z
          .string()
          .url()
          .refine((value) => new URL(value).protocol === "https:"),
      }),
    )
    .min(1),
});

export async function generateStill(input: {
  prompt: string;
  width: number;
  height: number;
}): Promise<{ url: string }> {
  const result = await fal.subscribe(MODEL, {
    input: {
      prompt: input.prompt,
      image_size: { width: input.width, height: input.height },
      num_images: 1,
      output_format: "png",
    },
  });
  const parsed = resultSchema.parse(result.data);
  return { url: parsed.images[0].url };
}
