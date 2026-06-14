"use client";

import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import { HeroPattern } from "../components/hero-pattern";
import {
  AudioLines,
  LayoutGrid,
  FileText,
  ImageIcon,
  BookOpen,
  Clapperboard,
  ArrowRight,
} from "lucide-react";
import { useStudioContext } from "@/hooks/use-studio-context";

const features = [
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

const products = [
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

export function DashboardView() {
  const { hasData, loading } = useStudioContext();

  const handleGenerateReport = () => {
    window.open("/api/studio/documents/strategy", "_blank");
  };

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader title="Studio" className="lg:hidden" />

      {/* Hero Section */}
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
            Max AI Studio brings together AI-powered text, voice, image, video, and
            course generation — for journalists chasing deadlines, educators
            building courses, and creators who need great content fast.
          </p>
        </div>
      </div>

      {/* Max Studio Intelligence */}
      <div className="px-6 lg:px-16 py-8">
        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-1">
            Max AI Studio Intelligence
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            AI-powered insights and actions across your business.
          </p>

          {hasData ? (
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-black text-white text-sm font-medium hover:bg-black/90 disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {loading ? "Generating Report..." : "Generate Strategy Report"}
            </button>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                Connect a Maxnovate product to unlock AI-powered insights,
                automated content, and cross-platform intelligence.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {products.map((product, i) => (
                  <Link
                    key={i}
                    href={product.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col gap-3 rounded-xl border border-border bg-background p-5 hover:border-primary hover:bg-primary/5 transition-all duration-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{product.emoji}</span>
                      <span className="font-semibold text-foreground">
                        {product.title}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                      {product.description}
                    </p>
                    <span className="text-sm text-primary font-medium group-hover:underline inline-flex items-center gap-1">
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
            </div>
          )}
        </div>
      </div>

      {/* Feature Grid */}
      <div className="flex-1 px-6 lg:px-16 pb-12">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-6">
          Tools for your content creation and workflow automation. Click any
          tool to get started.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
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
