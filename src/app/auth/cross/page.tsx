/**
 * app/auth/cross/page.tsx  (Studio)
 * Updated TYPE_ROUTE to include video → /videos
 */

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

const PLATFORM_API_URL = process.env.PLATFORM_API_URL ?? "http://localhost:4000";
const PLATFORM_API_KEY = process.env.PLATFORM_API_KEY ?? "";

const TYPE_ROUTE: Record<string, string> = {
  image:       "/image-generations",
  video:       "/videos",              // ← added
  description: "/text-generations",
  headline:    "/text-generations",
  script:      "/text-generations",
  captions:    "/text-generations",
};

interface Props {
  searchParams: Promise<{
    token?: string;
    courseId?: string;
    prompt?: string;
    type?: string;
    returnTo?: string;
  }>;
}

export default async function CrossAuthPage({ searchParams }: Props) {
  const { token, courseId, prompt, type, returnTo } = await searchParams;

  if (!token) {
    redirect("/sign-in?error=missing_token");
  }

  function buildDest(): string {
    const basePath =
      (type && TYPE_ROUTE[type]) ??
      (courseId ? `/generate?courseId=${courseId}` : "/");

    if (!prompt && !type) return basePath;

    const params = new URLSearchParams();
    if (prompt)    params.set("prompt", prompt);
    if (type)      params.set("type", type);
    if (returnTo)  params.set("returnTo", returnTo);

    return `${basePath}?${params.toString()}`;
  }

  const { userId } = await auth();
  if (userId) {
    redirect(buildDest());
  }

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

    if (!res.ok) redirect("/sign-in?error=invalid_token");

    platformUser = await res.json();
  } catch {
    redirect("/sign-in?error=token_error");
  }

  const signInParams = new URLSearchParams({
    redirect_url: buildDest(),
  });

  if (platformUser?.email) {
    signInParams.set("identifier", platformUser.email);
  }

  redirect(`/sign-in?${signInParams.toString()}`);
}
