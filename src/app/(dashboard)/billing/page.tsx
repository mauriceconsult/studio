"use client";

import { useState } from "react";

type Plan = "starter" | "pro";
type PaymentState = "idle" | "pending" | "polling" | "success" | "error";

interface PlanConfig {
  name: string;
  price: number;
  priceUSD: string;
  description: string;
  features: string[];
  popular?: boolean;
}

const PLANS: Record<Plan, PlanConfig> = {
  starter: {
    name: "Starter",
    price: 50000,
    priceUSD: "~$13",
    description: "For individuals getting started",
    features: [
      "5 course generations/month",
      "Standard voice cloning",
      "1 GB storage",
      "Community support",
    ],
  },
  pro: {
    name: "Pro",
    price: 120000,
    priceUSD: "~$32",
    description: "For creators and educators",
    features: [
      "Unlimited course generations",
      "Priority voice cloning",
      "10 GB storage",
      "Priority queue",
      "Email support",
    ],
    popular: true,
  },
};

export default function BillingPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan>("pro");
  const [phone, setPhone] = useState("");
  const [userId] = useState("user_demo"); // replace with session userId
  const [state, setState] = useState<PaymentState>("idle");
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handlePay() {
    if (!phone || phone.length < 9) {
      setError("Enter a valid MTN Uganda number (e.g. 256771234567)");
      return;
    }

    setError(null);
    setState("pending");

    try {
      // Step 1 — initiate Request to Pay
      const res = await fetch("/api/momo-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, phone, plan: selectedPlan }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Payment initiation failed");
      }

      const { referenceId: refId } = await res.json();
      setReferenceId(refId);
      setState("polling");

      // Step 2 — poll status (mirrors job polling)
      poll(refId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }

  function poll(refId: string) {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/momo-status?id=${refId}`);
        const data = await res.json();

        if (data.status === "SUCCESSFUL") {
          clearInterval(interval);
          setState("success");
        } else if (
          data.status === "FAILED" ||
          data.status === "CANCELLED"
        ) {
          clearInterval(interval);
          setError(
            data.reason ?? "Payment was not completed. Please try again."
          );
          setState("error");
        }
        // PENDING → keep polling
      } catch {
        clearInterval(interval);
        setError("Lost connection while checking payment. Check your plan status.");
        setState("error");
      }
    }, 2000);
  }

  function reset() {
    setState("idle");
    setError(null);
    setReferenceId(null);
    setPhone("");
  }

  const plan = PLANS[selectedPlan];

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <p className="text-xs font-medium tracking-widest text-gray-400 uppercase mb-1">
            Billing
          </p>
          <h1 className="text-2xl font-semibold text-gray-900">
            Choose your plan
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Pay securely with MTN Mobile Money. No card required.
          </p>
        </div>

        {/* Plan selector */}
        <div className="grid grid-cols-2 gap-3">
          {(Object.entries(PLANS) as [Plan, PlanConfig][]).map(([key, p]) => (
            <button
              key={key}
              onClick={() => setSelectedPlan(key)}
              disabled={state === "polling" || state === "success"}
              className={`relative text-left rounded-xl border p-4 transition-all focus:outline-none
                ${selectedPlan === key
                  ? "border-black bg-white shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-300"
                }
                disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {p.popular && (
                <span className="absolute -top-2.5 left-4 text-xs font-medium bg-black text-white px-2 py-0.5 rounded-full">
                  Most popular
                </span>
              )}
              <p className="font-medium text-gray-900 text-sm">{p.name}</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">
                {p.price.toLocaleString()}{" "}
                <span className="text-sm font-normal text-gray-400">UGX/mo</span>
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{p.priceUSD}/mo</p>
              <ul className="mt-3 space-y-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <svg className="w-3 h-3 text-black shrink-0" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {/* Payment form */}
        {state !== "success" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              {/* MTN Yellow dot indicator */}
              <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
              <p className="text-sm font-medium text-gray-700">
                MTN Mobile Money
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-gray-500" htmlFor="phone">
                MTN Uganda number
              </label>
              <div className="flex rounded-lg border border-gray-200 overflow-hidden focus-within:border-gray-400 transition-colors">
                <span className="flex items-center px-3 bg-gray-50 text-gray-400 text-sm border-r border-gray-200">
                  +256
                </span>
                <input
                  id="phone"
                  type="tel"
                  placeholder="771234567"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, ""));
                    setError(null);
                  }}
                  disabled={state === "polling" || state === "pending"}
                  maxLength={9}
                  className="flex-1 px-3 py-2.5 text-sm text-gray-900 outline-none bg-white disabled:opacity-50"
                />
              </div>
              <p className="text-xs text-gray-400">
                You will receive a prompt on your phone to approve the payment.
              </p>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
              <span className="text-sm text-gray-600">
                {plan.name} plan — monthly
              </span>
              <span className="text-sm font-semibold text-gray-900">
                UGX {plan.price.toLocaleString()}
              </span>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                <svg className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2"/>
                  <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            {/* CTA */}
            <button
              onClick={handlePay}
              disabled={state === "pending" || state === "polling" || !phone}
              className="w-full bg-black text-white rounded-lg py-3 text-sm font-medium
                hover:bg-gray-800 active:scale-[0.99] transition-all
                disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {state === "pending" && "Sending request…"}
              {state === "polling" && (
                <span className="flex items-center justify-center gap-2">
                  <Spinner /> Waiting for approval…
                </span>
              )}
              {(state === "idle" || state === "error") &&
                `Pay UGX ${plan.price.toLocaleString()}`}
            </button>

            {state === "polling" && (
              <p className="text-xs text-center text-gray-400">
                Check your phone and enter your MoMo PIN to confirm.
                This page will update automatically.
              </p>
            )}

            {state === "error" && (
              <button
                onClick={reset}
                className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Start over
              </button>
            )}
          </div>
        )}

        {/* Success state */}
        {state === "success" && (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              Payment confirmed
            </h2>
            <p className="text-sm text-gray-500">
              Your <span className="font-medium text-gray-700">{plan.name}</span> plan
              is now active. Start generating your first tutorial.
            </p>
            {referenceId && (
              <p className="text-xs text-gray-300 font-mono">{referenceId}</p>
            )}
            <a
              href="/generate"
              className="inline-block mt-2 bg-black text-white text-sm px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Start generating
            </a>
          </div>
        )}

        {/* Trust footer */}
        <p className="text-xs text-center text-gray-300">
          Payments processed via MTN Mobile Money Uganda ·{" "}
          <a href="/terms" className="hover:text-gray-500 transition-colors">Terms</a>{" "}
          ·{" "}
          <a href="/privacy" className="hover:text-gray-500 transition-colors">Privacy</a>
        </p>
      </div>
    </main>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin w-4 h-4 text-white"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
