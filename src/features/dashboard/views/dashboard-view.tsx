import { PageHeader } from "@/components/page-header";
import Link from "next/link";
import {
  AudioLines,
  LayoutGrid,
  FileText,
  ImageIcon,
  BookOpen,
  Clapperboard,
  ArrowRight,
} from "lucide-react";

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

export function DashboardView() {
  return (
    <div className="flex flex-col min-h-full">
      <PageHeader title="Studio" className="lg:hidden" />

      {/* Hero */}
      <div className="relative border-b border-dashed border-border overflow-hidden">
        {/* Subtle grid background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative px-6 py-12 lg:px-16 lg:py-20 max-w-3xl">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">
            AI Studio
          </p>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-foreground leading-tight mb-4">
            Everything your newsroom needs,{" "}
            <span className="text-muted-foreground font-normal">
              in one place.
            </span>
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xl">
            Studio brings together AI-powered text, voice, image, video, and
            course generation — built for editorial teams who need to move fast
            without compromising quality.
          </p>
        </div>
      </div>

      {/* Feature grid */}
      <div className="flex-1 p-6 lg:p-16">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-6">
          What you can do
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group relative flex flex-col gap-3 rounded-xl border border-border bg-background p-5 hover:border-foreground/20 hover:shadow-sm transition-all duration-200"
            >
              <div
                className={`inline-flex w-fit items-center justify-center rounded-lg border p-2 ${feature.accent}`}
              >
                <feature.icon className="size-4" />
              </div>
              <div className="flex-1 space-y-1.5">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  {feature.title}
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                Open
                <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
