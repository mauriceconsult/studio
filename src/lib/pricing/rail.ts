import { prisma } from "@/lib/db";
import type { Rail } from "./quote";

export async function pricingRailForOrg(orgId: string): Promise<Rail> {
  const momo = await prisma.momoCredits.findUnique({
    where: { orgId },
    select: { orgId: true },
  });
  return momo ? "momo" : "polar";
}
