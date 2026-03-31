/**
 * app/api/launcher/instaskul/route.ts
 * Mints a token for studio → instaskul direction.
 * Mirror of instaskul's /api/launcher/studio.
 */

import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { upsertUser, mintToken } from "@/lib/platform";

const INSTASKUL_URL = process.env.INSTASKUL_URL ?? "http://localhost:3002";

export async function POST() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const email = clerkUser.emailAddresses.find(
      (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress;

    if (!email) {
      return NextResponse.json({ error: "No primary email" }, { status: 400 });
    }

    // Upsert platform user
    const platformUser = await upsertUser({
      email,
      name: [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || email,
      phone: clerkUser.phoneNumbers?.[0]?.phoneNumber,
      avatarUrl: clerkUser.imageUrl,
    });

    // Mint token
    const { token } = await mintToken(platformUser.id, "studio", "instaskul");

    const url = `${INSTASKUL_URL}/auth/cross?token=${token}`;
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[api/launcher/instaskul]", err);
    return NextResponse.json(
      { error: "Failed to launch Instaskul" },
      { status: 500 }
    );
  }
}
