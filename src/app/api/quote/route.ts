import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { resolveCaller } from "@/lib/auth";
import { env } from "@/lib/env";
import { clampClipSeconds } from "@/lib/clips/limits";
import { pricingRailForOrg } from "@/lib/pricing/rail";
import {
  quoteClip,
  quoteImage,
  quoteSong,
  toPublicQuote,
} from "@/lib/pricing/quote";

const resolutionSchema = z
  .enum(["480p", "580p", "720p"])
  .default(env.CLIP_FAL_RESOLUTION);

const schema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("song"),
    durationSeconds: z.number().int().min(10).max(600),
    thinking: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("image"),
    count: z.number().int().min(1).max(50).default(1),
    width: z.number().int().min(512).max(4096).default(1920),
    height: z.number().int().min(512).max(4096).default(1080),
  }),
  z.object({
    type: z.literal("clip"),
    durationSeconds: z.number().int().min(3).max(10),
    resolution: resolutionSchema,
  }),
  z.object({
    type: z.literal("project"),
    musicVideoId: z.string().min(1),
    resolution: resolutionSchema,
  }),
]);

export async function POST(request: NextRequest) {
  const caller = await resolveCaller(request);
  if (!caller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const rail = await pricingRailForOrg(caller.orgId);
  const input = parsed.data;
  let responseBody:
    | { priceUgx: number; priceUsd: number }
    | {
        scenesReady: number;
        scenesToGenerate: number;
        lines: Array<{
          sceneId: string;
          position: number;
          kind: string;
          priceUgx: number;
          priceUsd: number;
        }>;
        priceUgx: number;
        priceUsd: number;
        renderIncluded: true;
      };
  let totalUgx: number;

  if (input.type === "song") {
    const quote = quoteSong(input.durationSeconds, rail, input.thinking);
    responseBody = toPublicQuote(quote);
    totalUgx = quote.priceUgx;
  } else if (input.type === "image") {
    const quote = quoteImage(
      input.count,
      rail,
      input.width,
      input.height,
    );
    responseBody = toPublicQuote(quote);
    totalUgx = quote.priceUgx;
  } else if (input.type === "clip") {
    const quote = quoteClip(
      input.durationSeconds,
      input.resolution,
      rail,
    );
    responseBody = toPublicQuote(quote);
    totalUgx = quote.priceUgx;
  } else {
    const project = await prisma.musicVideo.findFirst({
      where: {
        id: input.musicVideoId,
        orgId: caller.orgId,
        deletedAt: null,
      },
      include: { scenes: { orderBy: { position: "asc" } } },
    });
    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (project.scenes.some((scene) => scene.endMs <= scene.startMs)) {
      return NextResponse.json(
        { error: "Project contains scenes with invalid timing" },
        { status: 400 },
      );
    }

    const lines = project.scenes
      .filter(
        (scene) => !scene.assetId || scene.status !== "COMPLETED",
      )
      .map((scene) => {
        const isClip = scene.source === "AI_VIDEO";
        const quote = isClip
          ? quoteClip(
              clampClipSeconds(scene.endMs - scene.startMs),
              input.resolution,
              rail,
            )
          : quoteImage(
              1,
              rail,
              project.aspectRatio === "9:16"
                ? 720
                : project.aspectRatio === "1:1"
                  ? 1024
                  : 1280,
              project.aspectRatio === "9:16"
                ? 1280
                : project.aspectRatio === "1:1"
                  ? 1024
                  : 720,
            );
        return {
          sceneId: scene.id,
          position: scene.position,
          kind: isClip ? "clip" : "image",
          priceUgx: quote.priceUgx,
          priceUsd: quote.priceUsd,
        };
      });
    totalUgx = lines.reduce((total, line) => total + line.priceUgx, 0);
    const totalUsdCents = lines.reduce(
      (total, line) => total + Math.round(line.priceUsd * 100),
      0,
    );
    responseBody = {
      scenesReady: project.scenes.length - lines.length,
      scenesToGenerate: lines.length,
      lines,
      priceUgx: totalUgx,
      priceUsd: totalUsdCents / 100,
      renderIncluded: true,
    };
  }

  let balanceUgx: number | undefined;
  let canAfford: boolean | undefined;
  if (rail === "momo") {
    const credits = await prisma.momoCredits.findUnique({
      where: { orgId: caller.orgId },
      select: { topUpBalanceUgx: true },
    });
    balanceUgx = credits?.topUpBalanceUgx ?? 0;
    canAfford = balanceUgx >= totalUgx;
  }

  return NextResponse.json({
    type: input.type,
    rail,
    ...responseBody,
    ...(rail === "momo" ? { balanceUgx, canAfford } : {}),
  });
}
