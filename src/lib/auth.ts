import { auth } from "@clerk/nextjs/server";

export async function resolveCaller(request?: Request) {
  if (request?.signal.aborted) return null;
  const { userId, orgId } = await auth();
  if (!userId || !orgId) return null;

  return {
    userId,
    orgId,
    platformUserId: userId,
  };
}
