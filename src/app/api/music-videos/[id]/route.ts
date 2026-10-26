import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { resolveCaller } from "@/lib/auth";
import { getOwnedAsset } from "@/lib/assets";
import { signedUrl } from "@/lib/r2";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
  const caller = await resolveCaller(req);
  if (!caller)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const mv = await prisma.musicVideo.findFirst({
    where: { id, orgId: caller.orgId, deletedAt: null },
    include: {
      audioAsset: true,
      scenes: { orderBy: { position: "asc" }, include: { asset: true } },
      renders: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!mv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    ...mv,
    audioUrl: await signedUrl(mv.audioAsset.r2ObjectKey),
    scenes: await Promise.all(
      mv.scenes.map(async (s) => ({
        ...s,
        assetUrl: s.asset ? await signedUrl(s.asset.r2ObjectKey) : null,
      })),
    ),
    renders: await Promise.all(
      mv.renders.map(async (render) => ({
        ...render,
        videoUrl: render.r2ObjectKey
          ? await signedUrl(render.r2ObjectKey)
          : null,
      })),
    ),
  });
}

const patchSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  lyrics: z.string().max(8000).optional(),
  visualStyle: z.string().trim().min(10).max(300).nullable().optional(),
  characters: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(40),
        description: z.string().trim().min(1).max(160),
      }),
    )
    .max(4)
    .nullable()
    .optional(),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]).optional(),
  audioAssetId: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const caller = await resolveCaller(req);
  if (!caller)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const p = patchSchema.safeParse(await req.json().catch(() => null));
  if (!p.success)
    return NextResponse.json({ error: p.error.flatten() }, { status: 400 });

  const mv = await prisma.musicVideo.findFirst({
    where: { id, orgId: caller.orgId, deletedAt: null },
  });
  if (!mv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (mv.status !== "DRAFT")
    return NextResponse.json(
      { error: "Project is locked while rendering" },
      { status: 409 },
    );

  if (
    p.data.audioAssetId &&
    !(await getOwnedAsset(caller.orgId, p.data.audioAssetId, ["AUDIO"]))
  )
    return NextResponse.json(
      { error: "Audio asset not found" },
      { status: 400 },
    );

  const { characters: requestedCharacters, ...fields } = p.data;
  const data: Prisma.MusicVideoUncheckedUpdateInput = {
    ...fields,
    ...(requestedCharacters !== undefined
      ? {
          characters:
            requestedCharacters === null
              ? Prisma.DbNull
              : requestedCharacters,
        }
      : {}),
  };
  return NextResponse.json(
    await prisma.musicVideo.update({ where: { id }, data }),
  );
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
  const caller = await resolveCaller(req);
  if (!caller)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const r = await prisma.musicVideo.updateMany({
    where: { id, orgId: caller.orgId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return r.count
    ? NextResponse.json({ ok: true })
    : NextResponse.json({ error: "Not found" }, { status: 404 });
}
