import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "dotenv";

export const REQUIRED = [
  "POLAR_ACCESS_TOKEN",
  "POLAR_PRODUCT_ID",
  "POLAR_METER_VOICE_CREATION",
  "POLAR_METER_TTS_GENERATION",
  "POLAR_METER_VIDEO_MINUTES",
  "POLAR_METER_IMAGE_GENERATION",
  "POLAR_METER_TEXT_GENERATION",
  "DATABASE_URL",
  "APP_URL",
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "R2_ENDPOINT_URL",
  "FAL_KEY",
  "SONG_WEBHOOK_SECRET",
  "CLIP_WEBHOOK_SECRET",
  "CHATTERBOX_API_URL",
  "CHATTERBOX_API_KEY",
  "TTS_API_URL",
  "TTS_API_KEY",
  "TTS_VOICE_KEY",
  "H_FACE_TOKEN",
  "PLATFORM_API_URL",
  "PLATFORM_API_KEY",
  "INSTASKUL_URL",
  "CLERK_SECRET_KEY",
  "MOMO_BASE_URL",
  "MOMO_SUBSCRIPTION_KEY",
  "MOMO_API_USER",
  "MOMO_API_KEY",
  "NEXT_PUBLIC_STUDIO_URL",
  "NEXT_PUBLIC_INSTASKUL_URL",
  "NEXT_PUBLIC_MAXNOVATE_URL",
  "NEXT_PUBLIC_VENDLY_URL",
];

const SECRETS = ["SONG_WEBHOOK_SECRET", "CLIP_WEBHOOK_SECRET"];
const URLS = [
  "APP_URL",
  "R2_ENDPOINT_URL",
  "CHATTERBOX_API_URL",
  "TTS_API_URL",
  "PLATFORM_API_URL",
  "INSTASKUL_URL",
  "MOMO_BASE_URL",
  "NEXT_PUBLIC_STUDIO_URL",
  "NEXT_PUBLIC_INSTASKUL_URL",
  "NEXT_PUBLIC_MAXNOVATE_URL",
  "NEXT_PUBLIC_VENDLY_URL",
];

export function validateEnv(vars) {
  const issues = [];
  const issue = (name, message) => issues.push({ name, message });

  for (const name of REQUIRED) {
    const value = vars[name];
    if (value === undefined || value.trim() === "") {
      issue(name, value === undefined ? "missing" : "empty");
    }
  }

  for (const name of new Set([...REQUIRED, ...URLS])) {
    const value = vars[name];
    if (value === undefined || value.trim() === "") continue;
    if (value !== value.trim()) {
      issue(name, "has leading or trailing whitespace");
      continue;
    }

    if (SECRETS.includes(name)) {
      if (value.length < 32) {
        issue(name, `length ${value.length}, needs 32 or more`);
      }
      continue;
    }

    if (name === "DATABASE_URL") {
      let databaseUrl;
      try {
        databaseUrl = new URL(value);
      } catch {
        issue(name, "not a valid database URL");
        continue;
      }
      if (!["postgres:", "postgresql:"].includes(databaseUrl.protocol)) {
        issue(name, "must use postgres or postgresql");
      }
      continue;
    }

    if (!URLS.includes(name)) continue;
    let url;
    try {
      url = new URL(value);
    } catch {
      issue(name, "not a valid absolute URL");
      continue;
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      issue(name, "must use http or https");
    } else if (url.protocol !== "https:") {
      issue(name, "must use https in production");
    } else if (
      url.hostname === "localhost" ||
      url.hostname === "0.0.0.0" ||
      url.hostname.startsWith("127.")
    ) {
      issue(name, "points at localhost");
    }
  }

  return issues;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const file = process.argv[2] ?? ".env.vercel";
  const vars = parse(readFileSync(file, "utf8"));
  const issues = validateEnv(vars);
  const failed = new Set(issues.map(({ name }) => name));

  for (const { name, message } of issues) {
    console.log(`FAIL  ${name}: ${message}`);
  }
  for (const name of REQUIRED) {
    if (failed.has(name)) continue;
    if (SECRETS.includes(name)) {
      console.log(`ok    ${name}: length ${vars[name].length}`);
    } else {
      console.log(`ok    ${name}`);
    }
  }

  process.exitCode = issues.length ? 1 : 0;
}
