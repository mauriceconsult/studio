import { env } from "@/lib/env";

const API_BASE_URL =
  env.MPESA_ENVIRONMENT === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

interface DarajaTokenResponse {
  access_token: string;
  expires_in: string;
}

interface DarajaErrorResponse {
  errorMessage?: string;
  error_description?: string;
  ResponseDescription?: string;
}

export interface MpesaStkPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

export interface MpesaStkQueryResponse {
  ResponseCode?: string;
  ResponseDescription?: string;
  ResultCode?: string | number;
  ResultDesc?: string;
  Amount?: number | string;
  MpesaReceiptNumber?: string;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt) return cachedToken;

  const credentials = Buffer.from(
    `${env.MPESA_CONSUMER_KEY}:${env.MPESA_CONSUMER_SECRET}`,
  ).toString("base64");
  const response = await fetch(
    `${API_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: { Authorization: `Basic ${credentials}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as DarajaErrorResponse;
    throw new Error(
      `Daraja OAuth failed (${response.status}): ${body.error_description ?? body.errorMessage ?? "request rejected"}`,
    );
  }

  const data = (await response.json()) as DarajaTokenResponse;
  if (!data.access_token) throw new Error("Daraja OAuth returned no access token");

  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + Math.max(0, Number(data.expires_in) - 60) * 1000;
  return cachedToken;
}

function nairobiTimestamp(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}${values.month}${values.day}${values.hour}${values.minute}${values.second}`;
}

export function normalizeKenyanPhone(phone: string): string {
  const digits = phone.replace(/[\s()+-]/g, "");
  const normalized = digits.startsWith("0")
    ? `254${digits.slice(1)}`
    : digits.startsWith("254")
      ? digits
      : `254${digits}`;

  if (!/^254[17]\d{8}$/.test(normalized)) {
    throw new Error("Enter a valid Kenyan Safaricom mobile number");
  }

  return normalized;
}

async function darajaRequest<T>(
  path: string,
  body: Record<string, string | number>,
): Promise<T> {
  const accessToken = await getAccessToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as DarajaErrorResponse;
    throw new Error(
      `Daraja request failed (${response.status}): ${error.errorMessage ?? error.error_description ?? error.ResponseDescription ?? "request rejected"}`,
    );
  }

  return (await response.json()) as T;
}

export async function initiateMpesaStkPush(params: {
  amountKes: number;
  phone: string;
  accountReference: string;
  transactionDesc: string;
}): Promise<MpesaStkPushResponse> {
  if (!Number.isSafeInteger(params.amountKes) || params.amountKes < 1) {
    throw new Error("M-Pesa amount must be a positive whole number of KES");
  }

  const timestamp = nairobiTimestamp();
  const password = Buffer.from(
    `${env.MPESA_BUSINESS_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`,
  ).toString("base64");

  const response = await darajaRequest<MpesaStkPushResponse>(
    "/mpesa/stkpush/v1/processrequest",
    {
      BusinessShortCode: env.MPESA_BUSINESS_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: params.amountKes,
      PartyA: normalizeKenyanPhone(params.phone),
      PartyB: env.MPESA_BUSINESS_SHORTCODE,
      PhoneNumber: normalizeKenyanPhone(params.phone),
      CallBackURL: env.MPESA_CALLBACK_URL,
      AccountReference: params.accountReference.slice(0, 12),
      TransactionDesc: params.transactionDesc.slice(0, 13),
    },
  );

  if (response.ResponseCode !== "0" || !response.CheckoutRequestID) {
    throw new Error(
      `Daraja STK Push was rejected: ${response.ResponseDescription || "no checkout request ID returned"}`,
    );
  }

  return response;
}

export async function queryMpesaStkPush(
  checkoutRequestId: string,
): Promise<MpesaStkQueryResponse> {
  const timestamp = nairobiTimestamp();
  const password = Buffer.from(
    `${env.MPESA_BUSINESS_SHORTCODE}${env.MPESA_PASSKEY}${timestamp}`,
  ).toString("base64");

  return darajaRequest<MpesaStkQueryResponse>(
    "/mpesa/stkpushquery/v1/query",
    {
      BusinessShortCode: env.MPESA_BUSINESS_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    },
  );
}
