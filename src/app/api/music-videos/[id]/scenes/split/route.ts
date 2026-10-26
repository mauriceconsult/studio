import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveCaller } from "@/lib/auth";
import { splitLyricsIntoScenes } from "@/lib/music-video/split";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const caller = await resolveCaller(req);
  if (!caller) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const mv = await prisma.musicVideo.findFirst({
    where: { id, orgId: caller.orgId, deletedAt: null }, include: { audioAsset: true },
  });
  if (!mv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (mv.status !== "DRAFT") return NextResponse.json({ error: "Project is locked" }, { status: 409 });
  if (!mv.lyrics?.trim()) return NextResponse.json({ error: "Project has no lyrics" }, { status: 400 });
  if (!mv.audioAsset.durationMs)
    return NextResponse.json({ error: "Audio duration unknown" }, { status: 400 });

  const scenes = splitLyricsIntoScenes(mv.lyrics, mv.audioAsset.durationMs);
  if (!scenes.length) return NextResponse.json({ error: "No lyrics lines found" }, { status: 400 });

  // Don't wipe scenes with a clip in flight: that would orphan a paid generation
  const pending = await prisma.musicVideoScene.count({ where: { musicVideoId: id, status: "PENDING" } });
  if (pending) return NextResponse.json({ error: "Wait for running clips to finish" }, { status: 409 });

  await prisma.$transaction([
    prisma.musicVideoScene.deleteMany({ where: { musicVideoId: id } }),
    prisma.musicVideoScene.createMany({
      data: scenes.map((s) => ({
        musicVideoId: id, position: s.position, startMs: s.startMs, endMs: s.endMs,
        section: s.section, lyricsText: s.lyricsText, source: "AI_IMAGE" as const,
      })),
    }),
  ]);
  return NextResponse.json({ count: scenes.length }, { status: 201 });
}