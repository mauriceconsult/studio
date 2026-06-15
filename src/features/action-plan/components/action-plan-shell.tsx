"use client";

import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { useState } from "react";

interface Props {
  emoji: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function ActionPlanShell({
  emoji,
  title,
  description,
  children,
}: Props) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch("/api/studio/export-action-plan", {
        method: "POST",
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Max_AI_Studio_Action_Plan.docx";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 lg:px-16 py-4 border-b border-dashed border-border">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to Studio
        </Link>

        <button
          onClick={handleDownload}
          disabled={downloading}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground
                     hover:text-foreground transition-colors disabled:opacity-50"
        >
          <Download className="size-4" />
          {downloading ? "Downloading…" : "Download as Word"}
        </button>
      </div>

      {/* Header */}
      <div className="px-6 lg:px-16 py-10 border-b border-dashed border-border">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">
          Action plan
        </p>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{emoji}</span>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground max-w-xl">{description}</p>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 lg:px-16 py-8 max-w-3xl">{children}</div>
    </div>
  );
}
