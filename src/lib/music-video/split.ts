import type { SongStructureSection } from "@/generated/prisma/client";

const TAGS: [RegExp, SongStructureSection][] = [
  [/^pre[-\s]?chorus/i, "PRE_CHORUS"],
  [/^chorus/i, "CHORUS"],
  [/^verse/i, "VERSE"],
  [/^bridge/i, "BRIDGE"],
  [/^intro/i, "INTRO"],
  [/^outro/i, "OUTRO"],
  [/^hook/i, "HOOK"],
];

export interface SplitScene {
  position: number;
  startMs: number;
  endMs: number;
  section: SongStructureSection | null;
  lyricsText: string;
}

export function splitLyricsIntoScenes(
  lyrics: string,
  totalMs: number,
  targetSceneMs = 8000,
): SplitScene[] {
  const sections: { section: SongStructureSection | null; lines: string[] }[] =
    [];
  let cur: { section: SongStructureSection | null; lines: string[] } = {
    section: null,
    lines: [],
  };

  for (const raw of lyrics.split(/\r?\n/)) {
    const line = raw.trim();
    const tag = line.match(/^\[([^\]]+)\]$/);
    if (tag) {
      if (cur.lines.length) sections.push(cur);
      cur = {
        section: TAGS.find(([re]) => re.test(tag[1].trim()))?.[1] ?? null,
        lines: [],
      };
    } else if (line) cur.lines.push(line);
  }
  if (cur.lines.length) sections.push(cur);
  if (!sections.length) return [];

  const totalLines = sections.reduce((n, s) => n + s.lines.length, 0);
  const out: SplitScene[] = [];
  let cursor = 0;

  sections.forEach((s, i) => {
    const secMs =
      i === sections.length - 1
        ? totalMs - cursor // the last section absorbs rounding, so scenes end exactly at the song's end
        : Math.round((totalMs * s.lines.length) / totalLines);
    const n = Math.min(
      Math.max(1, Math.round(secMs / targetSceneMs)),
      s.lines.length,
    );
    for (let c = 0; c < n; c++) {
      const from = Math.floor((c * s.lines.length) / n);
      const to = Math.floor(((c + 1) * s.lines.length) / n);
      out.push({
        position: 0,
        startMs: cursor + Math.round((secMs * from) / s.lines.length),
        endMs: cursor + Math.round((secMs * to) / s.lines.length),
        section: s.section,
        lyricsText: s.lines.slice(from, to).join("\n"),
      });
    }
    cursor += secMs;
  });
  return out.map((s, i) => ({ ...s, position: i }));
}
