import { AssetKind } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { uploadObject } from "@/lib/r2";

export function getOwnedAsset(
  orgId: string,
  assetId: string,
  kinds: AssetKind[],
) {
  return prisma.mediaAsset.findFirst({
    where: {
      id: assetId,
      orgId,
      kind: { in: kinds },
      deletedAt: null,
    },
  });
}

const IMAGE_MAX_BYTES = 25 * 1024 * 1024;
const IMAGE_TYPES = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export async function assetFromImageGeneration(
  orgId: string,
  generationId: string,
) {
  const generation = await prisma.imageGeneration.findFirst({
    where: { id: generationId, orgId },
  });
  if (!generation) {
    throw new Error(`Image generation ${generationId} was not found`);
  }
  if (
    (generation.status !== "PROCESSING" &&
      generation.status !== "COMPLETED") ||
    !generation.outputUrl
  ) {
    throw new Error(`Image generation ${generationId} has no output to store`);
  }

  const existing = await prisma.mediaAsset.findUnique({
    where: { imageGenerationId: generation.id },
  });
  if (existing) {
    if (existing.deletedAt) {
      throw new Error(`Image asset for generation ${generationId} was deleted`);
    }
    return existing;
  }

  const outputUrl = new URL(generation.outputUrl);
  if (outputUrl.protocol !== "https:") {
    throw new Error("Image output URL must use HTTPS");
  }
  const response = await fetch(outputUrl, {
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok || !response.body) {
    throw new Error(`Could not download generated image (${response.status})`);
  }
  const contentType = (response.headers.get("content-type") ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (!Object.hasOwn(IMAGE_TYPES, contentType)) {
    throw new Error(`Unsupported generated image content type: ${contentType}`);
  }
  const contentLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > IMAGE_MAX_BYTES) {
    throw new Error("Generated image exceeds the 25 MB limit");
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > IMAGE_MAX_BYTES) {
      await reader.cancel();
      throw new Error("Generated image exceeds the 25 MB limit");
    }
    chunks.push(value);
  }
  const image = Buffer.concat(chunks, size);
  const extension =
    contentType === "image/png"
      ? IMAGE_TYPES["image/png"]
      : contentType === "image/jpeg"
        ? IMAGE_TYPES["image/jpeg"]
        : IMAGE_TYPES["image/webp"];
  const r2ObjectKey =
    `images/orgs/${generation.orgId}/${generation.id}.${extension}`;
  await uploadObject({ buffer: image, key: r2ObjectKey, contentType });

  return prisma.mediaAsset.create({
    data: {
      orgId: generation.orgId,
      platformUserId: generation.platformUserId,
      kind: "IMAGE",
      origin: "AI_GENERATED",
      name: "Generated image",
      r2ObjectKey,
      mimeType: contentType,
      fileSize: image.byteLength,
      width: generation.width,
      height: generation.height,
      imageGenerationId: generation.id,
    },
  });
}
