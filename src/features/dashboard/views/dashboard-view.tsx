"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { HeroPattern } from "../components/hero-pattern";
import {
  AudioLines,
  LayoutGrid,
  FileText,
  ImageIcon,
  BookOpen,
  Clapperboard,
  ArrowRight,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { EcosystemApp, useStudioContext } from "@/hooks/use-studio-context";

// ── Constants ─────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: AudioLines,
    title: "Text to Speech",
    description:
      "Convert any article or script into natural-sounding audio with studio-quality voices.",
    href: "/text-to-speech",
    accent: "bg-sky-50 text-sky-700 border-sky-100",
  },
  {
    icon: LayoutGrid,
    title: "Voices",
    description:
      "Browse and manage your voice library. Clone, customise, and deploy voices across projects.",
    href: "/voices",
    accent: "bg-violet-50 text-violet-700 border-violet-100",
  },
  {
    icon: FileText,
    title: "Text Generation",
    description:
      "Generate headlines, standfirsts, body copy, captions, and scripts tailored to your editorial style.",
    href: "/text-generations",
    accent: "bg-amber-50 text-amber-700 border-amber-100",
  },
  {
    icon: ImageIcon,
    title: "Image Generation",
    description:
      "Produce photojournalistic and editorial images to accompany any story — on demand.",
    href: "/image-generations",
    accent: "bg-emerald-50 text-emerald-700 border-emerald-100",
  },
  {
    icon: BookOpen,
    title: "Courses",
    description:
      "Structure your knowledge into structured learning experiences for any audience.",
    href: "/courses",
    accent: "bg-rose-50 text-rose-700 border-rose-100",
  },
  {
    icon: Clapperboard,
    title: "Videos",
    description:
      "Turn scripts and articles into polished video content ready to publish.",
    href: "/videos",
    accent: "bg-orange-50 text-orange-700 border-orange-100",
  },
] as const;

const ACTION_PLANS: {
  app: EcosystemApp;
  emoji: string;
  title: string;
  description: string;
  href: string;
}[] = [
  {
    app: "instaskul",
    emoji: "🎓",
    title: "Instaskul",
    description: "Optimise your school, courses, and evaluation pipeline.",
    href: "/action-plan/instaskul",
  },
  {
    app: "blog",
    emoji: "✍️",
    title: "Blog",
    description: "Build your beat, sharpen your voice, and publish faster.",
    href: "/action-plan/blog",
  },
  {
    app: "vendly",
    emoji: "🛍️",
    title: "Vendly",
    description: "Set up your store, products, and delivery workflow.",
    href: "/action-plan/vendly",
  },
  {
    app: "dukaboda",
    emoji: "🛵",
    title: "Dukaboda",
    description: "Join the network and optimise your delivery setup.",
    href: "/action-plan/dukaboda",
  },
];

const ECOSYSTEM_PRODUCTS = [
  {
    emoji: "🎓",
    title: "Educators & Coaches",
    description:
      "Create and sell courses, manage students, and get AI-generated course content.",
    href: process.env.NEXT_PUBLIC_INSTASKUL_URL ?? "https://instaskul.com",
    label: "Start on InstaSkul",
  },
  {
    emoji: "✍️",
    title: "Journalists & Creators",
    description:
      "Publish articles, build your readership, and get AI drafts for your next story.",
    href: process.env.NEXT_PUBLIC_MAXNOVATE_URL ?? "https://maxnovate.com",
    label: "Start your blog",
  },
  {
    emoji: "🛍️",
    title: "Entrepreneurs & SMEs",
    description:
      "Set up your online store, list products, and accept mobile money payments.",
    href: process.env.NEXT_PUBLIC_VENDLY_URL ?? "https://vendly.maxnovate.com",
    label: "Open your store",
  },
];

const MATCH_OPTIONS: { label: string; value: EcosystemApp }[] = [
  { label: "I teach, train, or coach people", value: "instaskul" },
  { label: "I write, report, or create content", value: "blog" },
  { label: "I run or sell products from a shop", value: "vendly" },
  { label: "I do deliveries or logistics", value: "dukaboda" },
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function ActionPlanCard({
  plan,
  primary = false,
}: {
  plan: (typeof ACTION_PLANS)[number];
  primary?: boolean;
}) {
  return (
    <Link
      href={plan.href}
      className={`group flex flex-col gap-3 rounded-xl border p-5 transition-all duration-200 ${
        primary
          ? "border-primary bg-primary/5 hover:bg-primary/10"
          : "border-border bg-background hover:border-primary hover:bg-primary/5"
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{plan.emoji}</span>
        <span className="font-semibold text-foreground">
          {plan.title} action plan
        </span>
      </div>
      <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
        {plan.description}
      </p>
      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
        Open plan <ArrowRight className="size-3.5" />
      </span>
    </Link>
  );
}

// ── Intelligence section ───────────────────────────────────────────────────────

function StudioIntelligence() {
  const { hasData, connectedApps, loading } = useStudioContext();
  const router = useRouter();

  const connectedPlans = ACTION_PLANS.filter((p) =>
    connectedApps.includes(p.app),
  );
  const primaryPlan = connectedPlans[0] ?? null;

  const [quizOpen, setQuizOpen] = useState(false);
  const [matchedApp, setMatchedApp] = useState<EcosystemApp | null>(null);
  const matchedPlan = ACTION_PLANS.find((p) => p.app === matchedApp) ?? null;

  return (
    <div className="px-6 lg:px-16 py-8">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-1">
          Max AI Studio Intelligence
        </h2>
        <p className="text-sm text-muted-foreground mb-6">
          AI-powered action plan for your Maxnovate product.
        </p>

        {/* ── hasData: connected user ───────────────────────────────────────── */}
        {hasData ? (
          <div className="space-y-5">
            <button
              onClick={() => primaryPlan && router.push(primaryPlan.href)}
              disabled={loading || !primaryPlan}
              className="flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm
                         font-medium text-white transition-colors hover:bg-black/90
                         disabled:opacity-60"
            >
              <Sparkles className="size-4" />
              {loading ? "Loading…" : "Generate action plan"}
            </button>

            {connectedPlans.length > 1 && (
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Your plans
                </p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {connectedPlans.map((plan, i) => (
                    <ActionPlanCard
                      key={plan.app}
                      plan={plan}
                      primary={i === 0}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── !hasData: unconnected user ──────────────────────────────────── */
          <div className="space-y-6">
            {/* Quiz trigger */}
            {!matchedPlan && !quizOpen && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  onClick={() => setQuizOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-black px-5 py-2.5
                             text-sm font-medium text-white hover:bg-black/90 transition-colors"
                >
                  <Sparkles className="size-4" />
                  Find my action plan
                </button>
                <p className="text-xs text-muted-foreground">
                  Answer one question — we&apos;ll match you to the right plan.
                </p>
              </div>
            )}

            {/* Quiz */}
            {quizOpen && (
              <div className="rounded-xl border border-border bg-background p-5 space-y-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    Which best describes what you do?
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    We&apos;ll match you to the right action plan.
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {MATCH_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => {
                        setMatchedApp(opt.value);
                        setQuizOpen(false);
                      }}
                      className="group flex items-center justify-between rounded-xl border border-border
                                 bg-background px-4 py-3 text-left text-sm font-medium text-foreground
                                 transition-all hover:border-primary hover:bg-primary/5"
                    >
                      {opt.label}
                      <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setQuizOpen(false)}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Browse all products instead
                </button>
              </div>
            )}

            {/* Matched result */}
            {matchedPlan && (
              <div className="space-y-3">
                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  Your match
                </p>
                <div className="max-w-sm">
                  <ActionPlanCard plan={matchedPlan} primary />
                </div>
                <button
                  onClick={() => setMatchedApp(null)}
                  className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                >
                  Not right? See all products
                </button>
              </div>
            )}

            {/* Ecosystem product cards — shown when quiz is closed and no match yet */}
            {!quizOpen && !matchedPlan && (
              <>
                <p className="text-sm text-muted-foreground">
                  Or connect a Maxnovate product to unlock your full action
                  plan.
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {ECOSYSTEM_PRODUCTS.map((product, i) => (
                    <Link
                      key={i}
                      href={product.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col gap-3 rounded-xl border border-border
                                 bg-background p-5 transition-all duration-200
                                 hover:border-primary hover:bg-primary/5"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{product.emoji}</span>
                        <span className="font-semibold text-foreground">
                          {product.title}
                        </span>
                      </div>
                      <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                        {product.description}
                      </p>
                      <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
                        {product.label} →
                      </span>
                    </Link>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground pt-2">
                  Already connected?{" "}
                  <button
                    onClick={() => window.location.reload()}
                    className="underline hover:text-foreground transition-colors"
                  >
                    Refresh to load your data
                  </button>
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────

export function DashboardView() {
  return (
    <div className="flex flex-col min-h-full">
      <PageHeader title="Studio" className="lg:hidden" />

      {/* Hero */}
      <div className="relative border-b border-dashed border-border overflow-hidden">
        <HeroPattern />
        <div className="relative px-6 py-12 lg:px-16 lg:py-20 max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
            Max AI Studio
          </p>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-foreground leading-tight mb-4">
            Create faster,{" "}
            <span className="text-muted-foreground font-normal">
              AI generation in one place.
            </span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            Max AI Studio brings together AI-powered text, voice, image, video,
            and course generation — for journalists chasing deadlines, educators
            building courses, and creators who need great content fast.
          </p>
        </div>
      </div>

      {/* Intelligence */}
      <StudioIntelligence />

      {/* Feature grid */}
      <div className="flex-1 px-6 lg:px-16 pb-12">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-6">
          Tools for your content creation and workflow automation. Click any
          tool to get started.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group relative flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 hover:border-foreground/30 hover:shadow transition-all duration-200"
            >
              <div
                className={`inline-flex w-fit items-center justify-center rounded-xl border p-3 ${feature.accent}`}
              >
                <feature.icon className="size-5" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
              <div className="mt-auto flex items-center gap-1.5 text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Open tool
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
