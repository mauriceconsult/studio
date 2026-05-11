import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/org-selection(.*)",
  "/api/generate-video",
  "/api/trpc(.*)",
]);

const isApiRoute = createRouteMatcher([
  "/api/(.*)",
  "/trpc/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // ── 1. Public routes — exit immediately, no auth checks ──────────────────
  if (isPublicRoute(req)) return NextResponse.next();

  // ── 2. API/tRPC — pass through, let the route handler return JSON errors ──
  if (isApiRoute(req)) return NextResponse.next();

  // ── 3. All other routes require auth ─────────────────────────────────────
  const { userId, orgId } = await auth();

  if (!userId) {
    const signIn = new URL("/sign-in", req.url);
    signIn.searchParams.set("redirect_url", req.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }

  // ── 4. Signed in but no org → org selection ───────────────────────────────
  if (!orgId) {
    const orgSelection = new URL("/org-selection", req.url);
    return NextResponse.redirect(orgSelection);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
