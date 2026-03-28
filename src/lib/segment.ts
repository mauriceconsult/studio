export interface Segment {
  text: string;
  start: number;
  end: number;
}

export function splitScript(script: string, wordsPerMin = 140): Segment[] {
  const sentences = script.match(/[^.!?]+[.!?]+/g) ?? [script];
  let cursor = 0;
  return sentences.map((text) => {
    const words = text.trim().split(/\s+/).length;
    const duration = (words / wordsPerMin) * 60;
    const seg = { text: text.trim(), start: cursor, end: cursor + duration };
    cursor += duration;
    return seg;
  });
}

export function toSRT(segments: Segment[]): string {
  const fmt = (s: number) => {
    const h = Math.floor(s / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const sec = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    const ms = Math.round((s % 1) * 1000)
      .toString()
      .padStart(3, "0");
    return `${h}:${m}:${sec},${ms}`;
  };
  return segments
    .map(
      (seg, i) =>
        `${i + 1}\n${fmt(seg.start)} --> ${fmt(seg.end)}\n${seg.text}`,
    )
    .join("\n\n");
}
