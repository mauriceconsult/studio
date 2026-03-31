/**
 * lib/platform.ts
 * Studio's client for the Maxnovate manager platform.
 * Calls manager API for identity, access, credits, and sessions.
 */

const PLATFORM_API_URL =
  process.env.PLATFORM_API_URL ?? "http://localhost:4000";

const PLATFORM_API_KEY = process.env.PLATFORM_API_KEY ?? "";

if (!PLATFORM_API_KEY) {
  console.warn("[platform] PLATFORM_API_KEY not set — requests will fail");
}

type App = "instaskul" | "studio" | "vendly";

// ── Base fetch ────────────────────────────────────────────────────────────────

async function call<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${PLATFORM_API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-api-key": PLATFORM_API_KEY,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`[platform] ${path} failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlatformUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface CreditBalance {
  userId: string;
  balance: number;
  lastUpdated: string;
}

export interface SessionToken {
  token: string;
  expiresAt: string;
}

// ── Identity ──────────────────────────────────────────────────────────────────

export async function upsertUser(data: {
  email: string;
  name: string;
  phone?: string;
  avatarUrl?: string;
}): Promise<PlatformUser> {
  return call<PlatformUser>("/api/users/upsert", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function getUser(userId: string): Promise<PlatformUser> {
  return call<PlatformUser>(`/api/users/${userId}`);
}

// ── Access ────────────────────────────────────────────────────────────────────

export async function hasAccess(
  userId: string,
  app: App
): Promise<boolean> {
  try {
    const res = await call<{ access: boolean }>(
      `/api/users/${userId}/access/${app}`
    );
    return res.access;
  } catch {
    return false;
  }
}

export async function grantAccess(
  userId: string,
  app: App,
  role = "consumer"
): Promise<void> {
  await call(`/api/users/${userId}/access`, {
    method: "POST",
    body: JSON.stringify({ app, role }),
  });
}

// ── Credits ───────────────────────────────────────────────────────────────────

export async function getBalance(userId: string): Promise<CreditBalance> {
  return call<CreditBalance>(`/api/users/${userId}/credits`);
}

export async function debit(params: {
  userId: string;
  app: App;
  eventType: string;
  amount: number;
  meta?: Record<string, unknown>;
}): Promise<CreditBalance> {
  return call<CreditBalance>(`/api/users/${params.userId}/credits/debit`, {
    method: "POST",
    body: JSON.stringify({
      app: params.app,
      eventType: params.eventType,
      amount: params.amount,
      meta: params.meta,
    }),
  });
}

export async function credit(params: {
  userId: string;
  app: App;
  eventType: string;
  amount: number;
  meta?: Record<string, unknown>;
}): Promise<CreditBalance> {
  return call<CreditBalance>(`/api/users/${params.userId}/credits/credit`, {
    method: "POST",
    body: JSON.stringify({
      app: params.app,
      eventType: params.eventType,
      amount: params.amount,
      meta: params.meta,
    }),
  });
}

// ── Cross-app sessions ────────────────────────────────────────────────────────

export async function mintToken(
  userId: string,
  originApp: App,
  targetApp: App
): Promise<SessionToken> {
  return call<SessionToken>("/api/sessions/mint", {
    method: "POST",
    body: JSON.stringify({ userId, originApp, targetApp }),
  });
}

export async function redeemToken(
  token: string,
  targetApp: App
): Promise<PlatformUser> {
  return call<PlatformUser>("/api/sessions/redeem", {
    method: "POST",
    body: JSON.stringify({ token, targetApp }),
  });
}

// ── Audit ─────────────────────────────────────────────────────────────────────

export function log(params: {
  userId?: string;
  app?: App;
  action: string;
  meta?: Record<string, unknown>;
}): void {
  call("/api/audit", {
    method: "POST",
    body: JSON.stringify(params),
  }).catch((err) => console.error("[platform] audit log failed:", err));
}

// ── Add these functions to studio's existing lib/platform.ts ─────────────────
// They proxy billing through manager instead of calling MoMo directly.

export interface BillingPayment {
  referenceId: string;
  plan: string;
  amount: number;
}

export interface BillingStatus {
  referenceId: string;
  status: "PENDING" | "SUCCESSFUL" | "FAILED" | "CANCELLED";
  reason?: string;
}

/**
 * Initiate a MoMo subscription payment via manager.
 * Replaces studio's direct /api/momo-pay call.
 */
export async function initiateBilling(params: {
  platformUserId: string;
  phone: string;
  plan: string;
}): Promise<BillingPayment> {
  return call<BillingPayment>("/api/billing/pay", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

/**
 * Poll payment status via manager.
 * Replaces studio's direct /api/momo-status call.
 */
export async function getBillingStatus(
  referenceId: string
): Promise<BillingStatus> {
  return call<BillingStatus>(`/api/billing/status?id=${referenceId}`);
}
