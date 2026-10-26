import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { resolveCaller } from "@/lib/auth";
import { getOwnedAsset } from "@/lib/assets";

const patchSchema = z.object({
  visualPrompt: z.string().max(1000).optional(),
  motion: z.string().max(40).nullable().optional(),
  transition: z.string().max(40).nullable().optional(),
  startMs: z.number().int().min(0).optional(),
  endMs: z.number().int().positive().optional(),
  assetId: z.string().nullable().optional(), // set = assign from the library; null = clear
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sceneId: string }> },
) {
  const caller = await resolveCaller(req);
  if (!caller)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, sceneId } = await params;

  const p = patchSchema.safeParse(await req.json().catch(() => null));
  if (!p.success)
    return NextResponse.json({ error: p.error.flatten() }, { status: 400 });
  const { assetId, ...fields } = p.data;

  const scene = await prisma.musicVideoScene.findFirst({
    where: {
      id: sceneId,
      musicVideoId: id,
      musicVideo: { orgId: caller.orgId, deletedAt: null, status: "DRAFT" },
    },
  });
  if (!scene) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const start = fields.startMs ?? scene.startMs,
    end = fields.endMs ?? scene.endMs;
  if (end <= start)
    return NextResponse.json(
      { error: "endMs must be after startMs" },
      { status: 400 },
    );

  const data: Record<string, unknown> = { ...fields };

  if (assetId !== undefined) {
    if (scene.status === "PENDING")
      return NextResponse.json(
        { error: "A clip is generating for this scene" },
        { status: 409 },
      );
    if (assetId === null) {
      Object.assign(data, { assetId: null, clipGenerationId: null });
    } else {
      const asset = await getOwnedAsset(caller.orgId, assetId, [
        "IMAGE",
        "VIDEO",
      ]);
      if (!asset)
        return NextResponse.json({ error: "Asset not found" }, { status: 400 });
      const uploaded = asset.origin === "UPLOADED";
      Object.assign(data, {
        assetId: asset.id,
        clipGenerationId: null,
        status: "COMPLETED",
        source:
          asset.kind === "VIDEO"
            ? uploaded
              ? "USER_VIDEO"
              : "AI_VIDEO"
            : uploaded
              ? "USER_IMAGE"
              : "AI_IMAGE",
      });
    }
  }
  return NextResponse.json(
    await prisma.musicVideoScene.update({ where: { id: sceneId }, data }),
  );
}
