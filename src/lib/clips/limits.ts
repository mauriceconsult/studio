export function clampClipSeconds(durationMs: number): number {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    throw new RangeError("Scene duration must be finite and positive");
  }
  return Math.min(10, Math.max(3, Math.round(durationMs / 1000)));
}
