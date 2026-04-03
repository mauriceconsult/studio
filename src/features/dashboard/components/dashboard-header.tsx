"use client";

const stats = [
  { label: "Audios generated", value: "1,284", delta: "↑ 12% this week" },
  { label: "Voices cloned", value: "38", delta: "↑ 3 new" },
  { label: "Courses created", value: "14", delta: "↑ 2 this month" },
  { label: "Videos rendered", value: "57", delta: "↑ 8 this week" },
];

export function DashboardHeader() {
  return (
    <div className="space-y-6">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-medium text-foreground">Studio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Speech, voice, courses &amp; video — all in one place.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-border bg-muted text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
          All systems operational
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-muted rounded-lg p-4">
            <p className="text-xs text-muted-foreground mb-1.5">{s.label}</p>
            <p className="text-2xl font-medium font-mono">{s.value}</p>
            <p className="text-xs text-emerald-600 mt-1">{s.delta}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
