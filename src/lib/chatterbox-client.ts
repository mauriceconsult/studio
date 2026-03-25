import createClient from "openapi-fetch";
import { env } from "./env";
import { paths } from "@/types/chatterbox-api";

export const chatterbox = createClient<paths>({
  baseUrl: env.CHATTERBOX_API_URL,
  headers: {
    "x-api-key": env.CHATTERBOX_API_KEY,
  },
});


