"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { ugxToKes } from "@/lib/billing/market";

type Plan = "starter" | "pro";

const PLANS: Record<Plan, { name: string; priceUgx: number; description: string }> = {
  starter: {
    name: "Starter",
    priceUgx: 50_000,
    description: "For individuals exploring AI creation",
  },
  pro: {
    name: "Pro",
    priceUgx: 120_000,
    description: "For creators and educators",
  },
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : "Payment could not be started.";
}

export default function BillingCheckout() {
  const trpc = useTRPC();
  const [plan, setPlan] = useState<Plan>("pro");
  const [phone, setPhone] = useState("");
  const [mpesaPaymentId, setMpesaPaymentId] = useState<string | null>(null);
  const [momoReferenceId, setMomoReferenceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const marketQuery = useQuery(trpc.billing.getMarket.queryOptions());
  const mpesaCheckout = useMutation(
    trpc.billing.initiateMpesaPlan.mutationOptions(),
  );
  const momoCheckout = useMutation(
    trpc.billing.initiateMomoPlan.mutationOptions(),
  );
  const createCardCheckout = useMutation(
    trpc.billing.createCheckout.mutationOptions(),
  );
  const mpesaStatus = useQuery(
    trpc.billing.getMpesaPaymentStatus.queryOptions(
      { paymentId: mpesaPaymentId ?? "" },
      {
        enabled: !!mpesaPaymentId,
        refetchInterval: (query) =>
          query.state.data?.status === "pending" ? 3000 : false,
      },
    ),
  );
  const momoStatus = useQuery(
    trpc.billing.getMomoPaymentStatus.queryOptions(
      { referenceId: momoReferenceId ?? "" },
      {
        enabled: !!momoReferenceId,
        refetchInterval: (query) =>
          query.state.data?.status === "PENDING" ? 3000 : false,
      },
    ),
  );

  const market = marketQuery.data?.market;
  const planInfo = PLANS[plan];
  const paymentStatus =
    market === "ke" ? mpesaStatus.data?.status : momoStatus.data?.status;
  const succeeded =
    paymentStatus === "successful" || paymentStatus === "SUCCESSFUL";
  const failed =
    paymentStatus === "failed" ||
    paymentStatus === "FAILED" ||
    paymentStatus === "CANCELLED" ||
    paymentStatus === "review";
  const waiting =
    !!mpesaPaymentId ||
    !!momoReferenceId ||
    mpesaCheckout.isPending ||
    momoCheckout.isPending ||
    createCardCheckout.isPending;

  async function pay() {
    setError(null);
    try {
      if (market === "ke") {
        const result = await mpesaCheckout.mutateAsync({ plan, phone });
        setMpesaPaymentId(result.paymentId);
      } else if (market === "ug") {
        const result = await momoCheckout.mutateAsync({ plan, phone });
        setMomoReferenceId(result.referenceId);
      } else {
        const result = await createCardCheckout.mutateAsync(undefined);
        window.location.assign(result.checkoutUrl);
      }
    } catch (paymentError) {
      setError(messageOf(paymentError));
    }
  }

  function reset() {
    setMpesaPaymentId(null);
    setMomoReferenceId(null);
    setPhone("");
    setError(null);
  }

  if (marketQuery.isLoading) {
    return <main className="mx-auto max-w-xl p-8 text-sm text-gray-500">Loading billing options…</main>;
  }
  if (marketQuery.isError) {
    return <main className="mx-auto max-w-xl p-8 text-sm text-red-600">{messageOf(marketQuery.error)}</main>;
  }
  if (market === "unresolved") {
    return (
      <main className="mx-auto max-w-xl space-y-2 p-8">
        <h1 className="text-xl font-semibold">Billing region required</h1>
        <p className="text-sm text-gray-500">
          Set your organization’s country during onboarding before starting a payment.
        </p>
      </main>
    );
  }

  const providerName =
    market === "ke"
      ? "Safaricom M-Pesa"
      : market === "ug"
        ? "MTN Mobile Money"
        : "Card checkout";

  return (
    <main className="mx-auto max-w-2xl space-y-8 px-4 py-12">
      <header>
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-gray-400">
          Billing · {market === "ke" ? "Kenya" : market === "ug" ? "Uganda" : "International"}
        </p>
        <h1 className="text-2xl font-semibold text-gray-900">Choose your plan</h1>
        <p className="mt-1 text-sm text-gray-500">
          Checkout is routed using your organization’s country. Your payment is processed by {providerName}.
        </p>
      </header>

      {market === "global" ? (
        <p className="rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
          Continue to Polar to purchase or manage your international subscription.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.entries(PLANS) as [Plan, (typeof PLANS)[Plan]][]).map(([id, item]) => (
            <button
              key={id}
              type="button"
              disabled={waiting}
              onClick={() => setPlan(id)}
              className={`rounded-xl border bg-white p-4 text-left transition-colors disabled:opacity-50 ${
                plan === id ? "border-black shadow-sm" : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <span className="block text-sm font-medium">{item.name}</span>
              <span className="mt-1 block text-xl font-semibold">
                {market === "ke"
                  ? `KES ${ugxToKes(item.priceUgx).toLocaleString()}`
                  : `UGX ${item.priceUgx.toLocaleString()}`}
                <span className="text-sm font-normal text-gray-400"> / month</span>
              </span>
              <span className="mt-1 block text-xs text-gray-500">{item.description}</span>
            </button>
          ))}
        </div>
      )}

      {!succeeded && (
        <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-6">
          {market !== "global" && (
            <div className="space-y-1">
              <label className="text-xs text-gray-500" htmlFor="mobile-money-phone">
                {market === "ke" ? "Safaricom Kenya number" : "MTN Uganda number"}
              </label>
              <input
                id="mobile-money-phone"
                type="tel"
                autoComplete="tel"
                placeholder={market === "ke" ? "0712345678 or 254712345678" : "771234567"}
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setError(null);
                }}
                disabled={waiting}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-gray-500 disabled:opacity-50"
              />
              <p className="text-xs text-gray-400">
                Approve the payment prompt on your phone. The page will confirm the result automatically.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-sm">
            <span>
              {market === "global"
                ? "International subscription"
                : `${planInfo.name} plan · monthly`}
            </span>
            <strong>
              {market === "ke"
                ? `KES ${ugxToKes(planInfo.priceUgx).toLocaleString()}`
                : market === "ug"
                  ? `UGX ${planInfo.priceUgx.toLocaleString()}`
                  : "Continue to checkout"}
            </strong>
          </div>

          {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          {failed && (
            <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {mpesaStatus.data?.resultDescription ??
                momoStatus.data?.reason ??
                "Payment was not completed. You can try again."}
            </p>
          )}

          <button
            type="button"
            onClick={() => void pay()}
            disabled={
              waiting ||
              (market !== "global" && phone.trim().length < 9)
            }
            className="w-full rounded-lg bg-black py-3 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mpesaCheckout.isPending || momoCheckout.isPending
              ? "Starting payment…"
              : mpesaPaymentId || momoReferenceId
                ? "Waiting for payment approval…"
                : market === "ke"
                  ? `Pay KES ${ugxToKes(planInfo.priceUgx).toLocaleString()}`
                  : market === "ug"
                    ? `Pay UGX ${planInfo.priceUgx.toLocaleString()}`
                    : "Continue to card checkout"}
          </button>
          {failed && (
            <button type="button" onClick={reset} className="w-full text-xs text-gray-500 hover:text-gray-800">
              Try again
            </button>
          )}
        </section>
      )}

      {succeeded && (
        <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-8 text-center">
          <h2 className="text-lg font-semibold">Payment confirmed</h2>
          <p className="text-sm text-gray-500">
            Your {planInfo.name} plan is active.
          </p>
          {mpesaStatus.data?.receipt && (
            <p className="font-mono text-xs text-gray-400">
              M-Pesa receipt: {mpesaStatus.data.receipt}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
