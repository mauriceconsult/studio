import { getJob } from "@/lib/job";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return Response.json({ error: "Missing id" }, { status: 400 });
  }

  const job = await getJob(id);

  return Response.json(job);
}
