import axios, { AxiosInstance } from "axios";

if (!process.env.CHATTERBOX_API_KEY) {
  throw new Error("CHATTERBOX_API_KEY is not configured");
}

const chatterbox: AxiosInstance = axios.create({
  baseURL: process.env.CHATTERBOX_API_URL ?? "https://api.chatterbox.io/v1",
  headers: {
    Authorization: `Bearer ${process.env.CHATTERBOX_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 30000, // ← 30s timeout for audio generation
});

export default chatterbox;
