import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { resolveCaller } from "@/lib/auth";
import { getOwnedAsset } from "@/lib/assets";

const createSchema = z.object({
  title: z.string().trim().min(1).max(120),
  audioAssetId: z.string(),
  lyrics: z.string().max(8000).optional(),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).default("16:9"),
});

export async function POST(req: NextRequest) {
  const caller = await resolveCaller(req);
  if (!caller)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p = createSchema.safeParse(await req.json().catch(() => null));
  if (!p.success)
    return NextResponse.json({ error: p.error.flatten() }, { status: 400 });

  const audio = await getOwnedAsset(caller.orgId, p.data.audioAssetId, [
    "AUDIO",
  ]);
  if (!audio)
    return NextResponse.json(
      { error: "Audio asset not found" },
      { status: 400 },
    );

  // Default the lyrics from the AI song this audio came from
  let lyrics = p.data.lyrics;
  if (!lyrics && audio.songGenerationId) {
    lyrics = (
      await prisma.songGeneration.findUnique({
        where: { id: audio.songGenerationId },
        select: { lyrics: true },
      })
    )?.lyrics;
  }

  const mv = await prisma.musicVideo.create({
    data: {
      orgId: caller.orgId,
      platformUserId: caller.platformUserId,
      title: p.data.title,
      audioAssetId: audio.id,
      lyrics,
      aspectRatio: p.data.aspectRatio,
    },
  });
  return NextResponse.json(mv, { status: 201 });
}

export async function GET(req: NextRequest) {
  const caller = await resolveCaller(req);
  if (!caller)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const list = await prisma.musicVideo.findMany({
    where: { orgId: caller.orgId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      audioAsset: { select: { name: true, durationMs: true } },
      _count: { select: { scenes: true, renders: true } },
    },
  });
  return NextResponse.json(list);
}
