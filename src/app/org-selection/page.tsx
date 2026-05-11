// app/org-selection/page.tsx

import { OrganizationList } from "@clerk/nextjs";

export default function OrgSelectionPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">

      {/* Explainer — shown above the Clerk component */}
      <div className="mb-8 text-center max-w-sm">
        <p className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted-foreground mb-2">
          One more step
        </p>
        <h1 className="text-xl font-semibold text-foreground mb-2">
          Set up your workspace
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Studio AI uses workspaces (organisations) to manage your projects
          and team. Create one to get started — it only takes a few seconds.
        </p>
      </div>

      <OrganizationList
        hidePersonal
        afterCreateOrganizationUrl="/"
        afterSelectOrganizationUrl="/"
      />

      {/* Footer hint */}
      <p className="mt-6 text-xs text-muted-foreground text-center max-w-xs">
        You can rename your workspace and invite team members from the
        settings page after signing in.
      </p>

    </div>
  );
}
