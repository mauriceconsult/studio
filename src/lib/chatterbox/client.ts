import chatterbox from "./index";
import type {
  TTSRequest,
  TTSResponse,
  VoicesResponse,
  UsageResponse,
  Voice,
} from "./types";

// Generate audio from text
export const generateSpeech = async (
  payload: TTSRequest,
): Promise<TTSResponse> => {
  const response = await chatterbox.post("/text-to-speech", payload);
  return response.data;
};

// Stream audio directly (for large texts)
export const streamSpeech = async (
  payload: TTSRequest,
): Promise<ReadableStream> => {
  const response = await chatterbox.post("/text-to-speech/stream", payload, {
    responseType: "stream",
  });
  return response.data;
};

// Get available voices
export const getVoices = async (): Promise<VoicesResponse> => {
  const response = await chatterbox.get("/voices");
  return response.data;
};

// Get a single voice
export const getVoice = async (voiceId: string): Promise<Voice> => {
  const response = await chatterbox.get(`/voices/${voiceId}`);
  return response.data;
};

// Get usage stats
export const getUsage = async (): Promise<UsageResponse> => {
  const response = await chatterbox.get("/usage");
  return response.data;
};
