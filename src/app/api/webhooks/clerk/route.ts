/**
 * POST /api/webhooks/clerk
 * Syncs Clerk user events to the Maxnovate manager platform.
 *
 * Events handled:
 *   user.created  → upsertUser + grantAccess("studio")
 *   user.updated  → upsertUser (keeps name/email in sync)
 *
 * Setup in Clerk Dashboard:
 *   Webhooks → Add Endpoint → https://your-studio-domain/api/webhooks/clerk
 *   Events: user.created, user.updated
 *   Copy Signing Secret → CLERK_WEBHOOK_SECRET in .env
 */

import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { upsertUser, grantAccess } from "@/lib/platform";

type ClerkUserEvent = {
  type: "user.created" | "user.updated";
  data: {
    id: string;
    email_addresses: { email_address: string; id: string }[];
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    phone_numbers: { phone_number: string }[];
  };
};

export async function POST(req: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CLERK_WEBHOOK_SECRET not set" },
      { status: 500 }
    );
  }

  // Verify webhook signature
  const svix_id        = req.headers.get("svix-id");
  const svix_timestamp = req.headers.get("svix-timestamp");
  const svix_signature = req.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return NextResponse.json(
      { error: "Missing svix headers" },
      { status: 400 }
    );
  }

  const body = await req.text();

  let event: ClerkUserEvent;
  try {
    const wh = new Webhook(secret);
    event = wh.verify(body, {
      "svix-id":        svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as ClerkUserEvent;
  } catch {
    return NextResponse.json(
      { error: "Invalid webhook signature" },
      { status: 401 }
    );
  }

  const { type, data } = event;

  // Extract primary email
  const primaryEmail = data.email_addresses.find(
    (e) => e.id === data.primary_email_address_id
  )?.email_address;

  if (!primaryEmail) {
    return NextResponse.json(
      { error: "No primary email found" },
      { status: 400 }
    );
  }

  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || primaryEmail;
  const phone = data.phone_numbers?.[0]?.phone_number ?? undefined;
  const avatarUrl = data.image_url ?? undefined;

  try {
    // Sync to manager platform
    const platformUser = await upsertUser({
      email: primaryEmail,
      name,
      phone,
      avatarUrl,
    });

    // On new user — grant studio access automatically
    if (type === "user.created") {
      await grantAccess(platformUser.id, "studio", "creator");
    }

    console.log(`[clerk-webhook] ${type} → platform user ${platformUser.id}`);
    return NextResponse.json({ synced: true, platformUserId: platformUser.id });
  } catch (err) {
    console.error("[clerk-webhook]", err);
    return NextResponse.json(
      { error: "Failed to sync user to platform" },
      { status: 500 }
    );
  }
}
