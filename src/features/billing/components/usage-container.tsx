"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CreditCard, Smartphone, Sparkles, AlertTriangle } from "lucide-react";

interface UsageContainerProps {
  plan: string;
  usage: number;
  limit: number;

  /**
   * Current billing region.
   * Today:
   *  - uganda        -> Mobile Money credits
   *  - international -> Polar subscriptions
   *
   * Later this should come from the Organization profile.
   */
  region: "uganda" | "international";

  onTopUp?: () => void;
  onUpgrade?: () => void;
}

export function UsageContainer({
  plan,
  usage,
  limit,
  region,
  onTopUp,
  onUpgrade,
}: UsageContainerProps) {
  const percentage = limit > 0 ? Math.min((usage / limit) * 100, 100) : 0;

  const unlimited = plan.toLowerCase() === "enterprise" || limit === Infinity;

  // Single source of truth
  const isCredits = region === "uganda";

  return (
    <div className="rounded-xl border bg-white p-5 space-y-5">
      {/* Header */}

      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-base">AI Usage</h3>

          <p className="text-sm text-muted-foreground">
            Current Plan <strong>{plan}</strong>
          </p>

          <p className="text-xs text-muted-foreground mt-1">
            {region === "uganda" ? "🇺🇬 Uganda" : "🌍 International"}
          </p>
        </div>

        <Sparkles className="h-5 w-5 text-purple-600" />
      </div>

      {/* Usage */}

      {!unlimited ? (
        <>
          <Progress value={percentage} />

          <div className="flex justify-between text-sm">
            <span>
              {usage.toLocaleString()} / {limit.toLocaleString()} credits
            </span>

            <span>{percentage.toFixed(0)}%</span>
          </div>

          {percentage >= 90 && (
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>You&apos;re approaching your monthly AI usage limit.</span>
            </div>
          )}
        </>
      ) : (
        <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
          Unlimited AI usage included with your plan.
        </div>
      )}

      {/* Billing */}

      <div className="space-y-2">
        {isCredits ? (
          <Button className="w-full" onClick={onTopUp}>
            <Smartphone className="mr-2 h-4 w-4" />
            Buy AI Credits
          </Button>
        ) : (
          <Button variant="outline" className="w-full" onClick={onUpgrade}>
            <CreditCard className="mr-2 h-4 w-4" />
            Upgrade Subscription
          </Button>
        )}
      </div>

      {/* Footer */}

      <div className="border-t pt-3 text-xs text-muted-foreground">
        {isCredits ? (
          <>
            Pay instantly with MTN Mobile Money. AI credits are added to your
            account immediately.
          </>
        ) : (
          <>Subscription billing is securely processed through Polar.</>
        )}
      </div>
    </div>
  );
}
