export type LyricsGenerationRecord = {
  id: string;
  prompt: string;
  genre: string | null;
  mood: string | null;
  language: string;
  targetTempoBpm: number | null;
  targetDurationMs: number | null;
  lyrics: string | null;
  status: string;
  errorMessage: string | null;
  sourceApp: string;
  sourceEntityId: string | null;
  createdAt: Date;
};
