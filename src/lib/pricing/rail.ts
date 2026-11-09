import { clerkClient } from "@clerk/nextjs/server";
import {
  assertMarketResolved,
  deriveMarket,
} from "@/lib/billing/market";
import type { Rail } from "./quote";

export async function pricingRailForOrg(orgId: string): Promise<Rail> {
  const client = await clerkClient();
  const org = await client.organizations.getOrganization({
    organizationId: orgId,
  });
  const market = deriveMarket(org.publicMetadata?.country as string | undefined);
  assertMarketResolved(market, orgId);
  if (market === "ke") return "mpesa";
  if (market === "ug") return "momo";
  return "polar";
}
