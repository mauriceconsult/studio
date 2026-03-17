export interface TTSRequest {
  text: string;
  voiceId: string;
  model?: string;
  stability?: number; // 0-1
  similarityBoost?: number; // 0-1
  style?: number; // 0-1
  speakerBoost?: boolean;
  outputFormat?: "mp3_44100" | "wav" | "pcm_16000";
}

export interface TTSResponse {
  audioUrl: string;
  durationSeconds: number;
  charactersUsed: number;
}

export interface Voice {
  id: string;
  name: string;
  category: string;
  description?: string;
  previewUrl?: string;
  labels?: Record<string, string>;
}

export interface VoicesResponse {
  voices: Voice[];
}

export interface UsageResponse {
  charactersUsed: number;
  charactersLimit: number;
  nextResetDate: string;
}
