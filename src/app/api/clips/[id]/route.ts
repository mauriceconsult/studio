import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveCaller } from "@/lib/auth";
import { signedUrl } from "@/lib/r2";
import { clipQueueStatus } from "@/lib/clips/provider";
import { processClip } from "@/lib/clips/process";
import { failVideoClipGeneration } from "@/lib/music-video/output";
import * as Sentry from "@sentry/nextjs";

export const maxDuration = 120;
const GIVE_UP_MS = 20 * 60_000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const caller = await resolveCaller(req);
  if (!caller)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  let clip = await prisma.videoClipGeneration.findFirst({
    where: { id, orgId: caller.orgId },
    include: { outputAsset: true },
  });
  if (!clip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (
    (clip.status === "PENDING" || clip.status === "PROCESSING") &&
    clip.providerJobId
  ) {
    try {
      const status = await clipQueueStatus(clip.provider, clip.providerJobId);
      if (status.status === "COMPLETED") await processClip(clip.id);
      else if (Date.now() - clip.createdAt.getTime() > GIVE_UP_MS) {
        await failVideoClipGeneration(clip.id, "Timed out");
      } else if (status.status === "IN_PROGRESS" && clip.status === "PENDING") {
        await prisma.videoClipGeneration.updateMany({
          where: { id: clip.id, status: "PENDING" },
          data: { status: "PROCESSING" },
        });
      }
    } catch (error) {
      Sentry.logger.error("Failed to poll video clip generation", {
        generationId: clip.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    const updatedClip = await prisma.videoClipGeneration.findFirst({
      where: { id, orgId: caller.orgId },
      include: { outputAsset: true },
    });
    if (!updatedClip) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    clip = updatedClip;
  }

  return NextResponse.json({
    id: clip.id,
    status: clip.status,
    errorMessage: clip.errorMessage,
    quote:
      clip.priceUgx === null ||
      clip.priceUsdCents === null ||
      clip.pricingRail === null
        ? null
        : {
            priceUgx: clip.priceUgx,
            priceUsd: clip.priceUsdCents / 100,
            rail: clip.pricingRail,
            resolution: clip.resolution,
          },
    assetId: clip.outputAsset?.id ?? null,
    videoUrl: clip.outputAsset
      ? await signedUrl(clip.outputAsset.r2ObjectKey)
      : null,
  });
}
