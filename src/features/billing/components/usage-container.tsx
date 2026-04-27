"use client";

import { useCallback, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useCheckout } from "@/features/billing/hooks/use-checkout";
import { useTRPC } from "@/trpc/client";

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatUSD(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatUGX(ugx: number): string {
  return new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    maximumFractionDigits: 0,
  }).format(ugx);
}

// ─── Unresolved market — onboarding prompt ────────────────────────────────────
// Shown when org.publicMetadata.country has never been set.
// Calls billing.setMarket which writes to Clerk then returns the resolved market.

function UnresolvedMarketCard() {
  const trpc = useTRPC();
  const [selected, setSelected] = useState<"UG" | "global" | null>(null);

  const setMarketMutation = useMutation(
    trpc.billing.setMarket.mutationOptions(),
  );

  const handleConfirm = useCallback(() => {
    if (!selected) return;
    // We send "UG" for Uganda, "US" as a stand-in for global
    // (any non-UG two-letter code resolves to "global")
    setMarketMutation.mutate({ country: selected === "global" ? "US" : "UG" });
  }, [selected, setMarketMutation]);

  if (setMarketMutation.isSuccess) {
    // Market is now set — the parent's useQuery will refetch automatically
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Region saved
        </p>
        <p className="text-xs text-muted-foreground">
          Your billing region is now configured. Loading your plan…
        </p>
        <Spinner className="size-4 mt-1" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Set your billing region
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Choose your region to enable the correct payment method.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {(
          [
            { id: "UG", label: "Uganda", sub: "Pay with MoMo" },
            { id: "global", label: "International", sub: "Pay with card" },
          ] as const
        ).map((opt) => (
          <button
            key={opt.id}
            onClick={() => setSelected(opt.id)}
            className={`text-left rounded-md border px-2.5 py-2 transition-all text-xs focus:outline-none
              ${selected === opt.id
                ? "border-foreground bg-foreground/5"
                : "border-border hover:border-foreground/40"
              }`}
          >
            <p className="font-medium text-foreground">{opt.label}</p>
            <p className="text-muted-foreground mt-0.5">{opt.sub}</p>
          </button>
        ))}
      </div>

      {setMarketMutation.isError && (
        <p className="text-xs text-destructive">
          {setMarketMutation.error?.message ?? "Failed to save region"}
        </p>
      )}

      <Button
        variant="outline"
        className="w-full text-xs"
        size="sm"
        disabled={!selected || setMarketMutation.isPending}
        onClick={handleConfirm}
      >
        {setMarketMutation.isPending ? (
          <>
            <Spinner className="size-3" /> Saving…
          </>
        ) : (
          "Confirm region"
        )}
      </Button>
    </div>
  );
}

// ─── Global upgrade card (Polar checkout) ─────────────────────────────────────

function GlobalUpgradeCard() {
  const { checkout, isPending } = useCheckout();

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Pay as you go
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Speech from $0.30 / 1k chars · Courses $2.25 / tutorial
        </p>
      </div>
      <Button
        variant="outline"
        className="w-full text-xs"
        size="sm"
        disabled={isPending}
        onClick={checkout}
      >
        {isPending ? (
          <>
            <Spinner className="size-3" /> Redirecting…
          </>
        ) : (
          "Upgrade"
        )}
      </Button>
    </div>
  );
}

// ─── UG upgrade card (MoMo plan selection) ────────────────────────────────────

const MOMO_PLANS = [
  {
    id: "starter" as const,
    label: "Starter",
    ugx: 50_000,
    desc: "8 tutorials · 100k chars · 1 voice",
  },
  {
    id: "pro" as const,
    label: "Pro",
    ugx: 120_000,
    desc: "Unlimited tutorials & speech · 5 voices",
  },
];

function MomoUpgradeCard() {
  const trpc = useTRPC();
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "pro">("starter");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const initiateMutation = useMutation(
    trpc.billing.initiateMomoPlan.mutationOptions(),
  );

  const handlePay = useCallback(() => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 9) {
      setPhoneError("Enter a valid MTN Uganda number");
      return;
    }
    setPhoneError(null);
    const fullPhone = digits.startsWith("256") ? digits : `256${digits}`;
    initiateMutation.mutate({ plan: selectedPlan, phone: fullPhone });
  }, [phone, selectedPlan, initiateMutation]);

  if (initiateMutation.isSuccess) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Check your phone
        </p>
        <p className="text-xs text-muted-foreground">
          Approve the MoMo prompt to activate your{" "}
          <span className="font-medium text-foreground capitalize">
            {selectedPlan}
          </span>{" "}
          plan. This card will update automatically.
        </p>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Spinner className="size-3" />
          Waiting for approval…
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Subscribe with MoMo
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          MTN Mobile Money · No card required
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {MOMO_PLANS.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={`text-left rounded-md border px-2.5 py-2 transition-all text-xs focus:outline-none
              ${
                selectedPlan === plan.id
                  ? "border-foreground bg-foreground/5"
                  : "border-border hover:border-foreground/40"
              }`}
          >
            <p className="font-medium text-foreground">{plan.label}</p>
            <p className="text-muted-foreground font-mono">
              {formatUGX(plan.ugx)}
              <span className="font-sans">/mo</span>
            </p>
            <p className="text-muted-foreground/70 mt-0.5 leading-tight">
              {plan.desc}
            </p>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1">
        <div
          className={`flex rounded-md border overflow-hidden transition-colors
            focus-within:border-foreground/60
            ${phoneError ? "border-destructive" : "border-border"}`}
        >
          <span className="flex items-center px-2 bg-muted text-muted-foreground text-xs border-r border-border">
            +256
          </span>
          <input
            type="tel"
            placeholder="771234567"
            value={phone}
            maxLength={9}
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, ""));
              setPhoneError(null);
            }}
            disabled={initiateMutation.isPending}
            className="flex-1 px-2.5 py-2 text-xs bg-background text-foreground outline-none
              placeholder:text-muted-foreground/50 disabled:opacity-50"
          />
        </div>
        {phoneError && (
          <p className="text-xs text-destructive">{phoneError}</p>
        )}
        {initiateMutation.isError && (
          <p className="text-xs text-destructive">
            {initiateMutation.error?.message ?? "Payment initiation failed"}
          </p>
        )}
      </div>

      <Button
        variant="outline"
        className="w-full text-xs"
        size="sm"
        disabled={initiateMutation.isPending || !phone}
        onClick={handlePay}
      >
        {initiateMutation.isPending ? (
          <>
            <Spinner className="size-3" /> Sending request…
          </>
        ) : (
          `Pay ${formatUGX(MOMO_PLANS.find((p) => p.id === selectedPlan)!.ugx)}`
        )}
      </Button>
    </div>
  );
}

// ─── Active subscription — Global ─────────────────────────────────────────────

function GlobalUsageCard({
  estimatedCostCents,
}: {
  estimatedCostCents: number;
}) {
  const trpc = useTRPC();
  const portalMutation = useMutation(
    trpc.billing.createPortalSession.mutationOptions(),
  );

  const openPortal = useCallback(() => {
    portalMutation.mutate(undefined, {
      onSuccess: (data) => window.open(data.portalUrl, "_blank"),
    });
  }, [portalMutation]);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold tracking-tight text-foreground">
          Current usage
        </p>
        <p className="text-xl font-bold tracking-tight text-foreground mt-1">
          {formatUSD(estimatedCostCents)}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Estimated this period
        </p>
      </div>
      <Button
        variant="outline"
        className="w-full text-xs"
        size="sm"
        disabled={portalMutation.isPending}
        onClick={openPortal}
      >
        {portalMutation.isPending ? (
          <>
            <Spinner className="size-3" /> Redirecting…
          </>
        ) : (
          "Manage Subscription"
        )}
      </Button>
    </div>
  );
}

// ─── Active subscription — UG ─────────────────────────────────────────────────

interface MomoCredits {
  minutesRemaining: number;
  charsRemaining: number;
  voicesRemaining: number;
}

function MomoUsageCard({
  plan,
  credits,
}: {
  plan: string | null;
  credits: MomoCredits | null;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            Active plan
          </p>
          {plan && (
            <span className="text-xs font-medium capitalize bg-foreground text-background px-1.5 py-0.5 rounded-full">
              {plan}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">MTN Mobile Money</p>
      </div>

      {credits && (
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { label: "Minutes", value: credits.minutesRemaining },
            {
              label: "Chars",
              value: `${(credits.charsRemaining / 1000).toFixed(0)}k`,
            },
            { label: "Voices", value: credits.voicesRemaining },
          ].map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col items-center rounded-md border border-border
                bg-muted/40 py-1.5 px-1"
            >
              <p className="text-sm font-bold text-foreground">{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Top up anytime · Renews monthly
      </p>
    </div>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

export function UsageContainer() {
  const trpc = useTRPC();

  const { data: marketData, isLoading: marketLoading } = useQuery(
    trpc.billing.getMarket.queryOptions(),
  );

  const market = marketData?.market;

  // Don't fetch status until market is known — avoids a PRECONDITION_FAILED
  // from getStatus while the org still has no country set.
  const { data: statusData } = useQuery({
    ...trpc.billing.getStatus.queryOptions(),
    enabled: market !== undefined && market !== "unresolved",
  });

  const isUG = market === "ug";

  return (
    <div className="group-data-[collapsible=icon]:hidden bg-background border border-border rounded-lg p-3">
      {/* Loading skeleton */}
      {marketLoading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Spinner className="size-3" />
          Loading billing…
        </div>
      )}

      {/* Country never set → ask before anything else */}
      {!marketLoading && market === "unresolved" && <UnresolvedMarketCard />}

      {/* Market resolved — show subscription state */}
      {!marketLoading && market !== "unresolved" && market !== undefined && (
        <>
          {statusData?.hasActiveSubscription ? (
            isUG ? (
              <MomoUsageCard
                plan={statusData.plan}
                credits={statusData.credits as MomoCredits | null}
              />
            ) : (
              <GlobalUsageCard
                estimatedCostCents={statusData.estimatedCostCents ?? 0}
              />
            )
          ) : isUG ? (
            <MomoUpgradeCard />
          ) : (
            <GlobalUpgradeCard />
          )}
        </>
      )}
    </div>
  );
}
