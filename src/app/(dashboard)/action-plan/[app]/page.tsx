import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { BlogPlan } from "@/features/action-plan/views/blog-plan";
import { DukabodaPlan } from "@/features/action-plan/views/dukaboda-plan";
import { InskakulPlan } from "@/features/action-plan/views/instaskul-plan";
import { VendlyPlan } from "@/features/action-plan/views/vendly-plan";
import { EcosystemApp } from "@/hooks/use-studio-context";

const VALID_APPS: EcosystemApp[] = ["instaskul", "blog", "vendly", "dukaboda"];

const META: Record<EcosystemApp, { title: string }> = {
  instaskul: { title: "Instaskul Action Plan — Max AI Studio" },
  blog: { title: "Blog Action Plan — Max AI Studio" },
  vendly: { title: "Vendly Action Plan — Max AI Studio" },
  dukaboda: { title: "Dukaboda Action Plan — Max AI Studio" },
};

const VIEWS: Record<EcosystemApp, React.ComponentType> = {
  instaskul: InskakulPlan,
  blog: BlogPlan,
  vendly: VendlyPlan,
  dukaboda: DukabodaPlan,
};

interface Props {
  params: Promise<{ app: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { app } = await params;
  if (!VALID_APPS.includes(app as EcosystemApp)) return {};
  return { title: META[app as EcosystemApp].title };
}

export default async function ActionPlanPage({ params }: Props) {
  const { app } = await params;
  if (!VALID_APPS.includes(app as EcosystemApp)) notFound();

  const View = VIEWS[app as EcosystemApp];
  return <View />;
}
