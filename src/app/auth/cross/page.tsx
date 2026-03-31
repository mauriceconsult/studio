/**
 * app/auth/cross/page.tsx
 * Cross-app landing page for studio.
 * Redeems a manager session token and signs the user into studio via Clerk.
 *
 * Flow:
 *   instaskul mints token → redirects to /auth/cross?token=xxx
 *   This page redeems the token → gets PlatformUser
 *   Looks up or creates Clerk user by email
 *   Signs them in → redirects to /generate (or courseId context)
 */

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

const PLATFORM_API_URL = process.env.PLATFORM_API_URL ?? "http://localhost:4000";
const PLATFORM_API_KEY = process.env.PLATFORM_API_KEY ?? "";

interface Props {
  searchParams: { token?: string; courseId?: string };
}

export default async function CrossAuthPage({ searchParams }: Props) {
  const { token, courseId } = searchParams;

  if (!token) {
    redirect("/sign-in?error=missing_token");
  }

  // Check if already signed in — skip redemption
  const { userId } = await auth();
  if (userId) {
    const dest = courseId
      ? `/generate?courseId=${courseId}`
      : "/generate";
    redirect(dest);
  }

  // Redeem token via manager
  let platformUser: { email: string; name: string } | null = null;

  try {
    const res = await fetch(`${PLATFORM_API_URL}/api/sessions/redeem`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": PLATFORM_API_KEY,
      },
      body: JSON.stringify({ token, targetApp: "studio" }),
      cache: "no-store",
    });

    if (!res.ok) {
      redirect("/sign-in?error=invalid_token");
    }

    platformUser = await res.json();
  } catch {
    redirect("/sign-in?error=token_error");
  }

  // Token is valid — redirect to Clerk sign-in pre-filled with email
  // Clerk will sign them in seamlessly if they have an existing session
  // or prompt sign-in with their known email
  const signInParams = new URLSearchParams({
    redirect_url: courseId ? `/generate?courseId=${courseId}` : "/generate",
  });

  if (platformUser?.email) {
    signInParams.set("identifier", platformUser.email);
  }

  redirect(`/sign-in?${signInParams.toString()}`);
}
