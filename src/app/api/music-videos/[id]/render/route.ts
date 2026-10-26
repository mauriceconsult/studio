import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/db";
import { resolveCaller } from "@/lib/auth";

type RouteContext = { params: Promise<{ id: string }> };

class InvalidRenderRequestError extends Error {}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const caller = await resolveCaller(req);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const render = await prisma.$transaction(async (tx) => {
      const claimed = await tx.musicVideo.updateMany({
        where: {
          id,
          orgId: caller.orgId,
          deletedAt: null,
          status: { in: ["DRAFT", "FAILED"] },
        },
        data: { status: "RENDERING" },
      });
      if (claimed.count === 0) return null;

      const project = await tx.musicVideo.findFirst({
        where: { id, orgId: caller.orgId, deletedAt: null },
        include: {
          audioAsset: true,
          scenes: { orderBy: { position: "asc" }, include: { asset: true } },
        },
      });
      if (!project) return null;
      if (project.scenes.length === 0) {
        throw new InvalidRenderRequestError(
          "Add scenes before rendering this music video",
        );
      }

      let timelineEndMs = 0;
      const timelineScenes: Prisma.InputJsonValue[] = [];
      for (const scene of project.scenes) {
        const asset = scene.asset;
        if (scene.status !== "COMPLETED" || !asset || asset.deletedAt) {
          throw new InvalidRenderRequestError(
            "Every scene must have a completed visual before rendering",
          );
        }
        if (scene.startMs !== timelineEndMs || scene.endMs <= scene.startMs) {
          throw new InvalidRenderRequestError(
            "Scene timings must be continuous and have positive duration",
          );
        }
        if (asset.kind !== "IMAGE" && asset.kind !== "VIDEO") {
          throw new InvalidRenderRequestError(
            `Scene ${scene.id} has an unsupported asset kind`,
          );
        }
        timelineEndMs = scene.endMs;
        timelineScenes.push({
          startMs: scene.startMs,
          endMs: scene.endMs,
          r2ObjectKey: asset.r2ObjectKey,
          mimeType: asset.mimeType,
          kind: asset.kind,
        });
      }
      if (
        project.audioAsset.durationMs === null ||
        timelineEndMs !== project.audioAsset.durationMs
      ) {
        throw new InvalidRenderRequestError(
          "Scene timeline must match the audio duration",
        );
      }

      const timeline: Prisma.InputJsonObject = {
        aspectRatio: project.aspectRatio,
        audio: {
          r2ObjectKey: project.audioAsset.r2ObjectKey,
          mimeType: project.audioAsset.mimeType,
          durationMs: project.audioAsset.durationMs,
        },
        scenes: timelineScenes,
      };

      return tx.videoRender.create({
        data: { musicVideoId: project.id, timeline, status: "PENDING" },
        select: { id: true, status: true },
      });
    });

    if (!render) {
      return NextResponse.json(
        { error: "Project is already rendering or not available" },
        { status: 409 },
      );
    }
    return NextResponse.json(render, { status: 202 });
  } catch (error) {
    if (error instanceof InvalidRenderRequestError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    Sentry.logger.error("Could not queue music video render", {
      musicVideoId: id,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Could not queue render" },
      { status: 500 },
    );
  }
}
