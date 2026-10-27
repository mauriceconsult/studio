import assert from "node:assert/strict";
import test from "node:test";
import { REQUIRED, validateEnv } from "./check-env.mjs";

function validEnv() {
  const vars = Object.fromEntries(
    REQUIRED.map((name) => [name, "configured-value"]),
  );
  vars.DATABASE_URL = "postgresql://user:password@db.example.test/studio";
  vars.SONG_WEBHOOK_SECRET = "s".repeat(32);
  vars.CLIP_WEBHOOK_SECRET = "c".repeat(32);
  for (const name of [
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
  ]) {
    vars[name] = "https://example.test";
  }
  return vars;
}

test("accepts required schema variables and ignores Clerk route paths", () => {
  const vars = validEnv();
  vars.NEXT_PUBLIC_CLERK_SIGN_IN_URL = "/sign-in";

  assert.deepEqual(validateEnv(vars), []);
});

test("reports required variables that are missing or blank", () => {
  const vars = validEnv();
  delete vars.POLAR_ACCESS_TOKEN;
  vars.R2_BUCKET_NAME = "  ";

  assert.deepEqual(
    validateEnv(vars).filter(({ name }) => ["POLAR_ACCESS_TOKEN", "R2_BUCKET_NAME"].includes(name)),
    [
      { name: "POLAR_ACCESS_TOKEN", message: "missing" },
      { name: "R2_BUCKET_NAME", message: "empty" },
    ],
  );
});

test("validates production URLs and webhook secret lengths", () => {
  const vars = validEnv();
  vars.APP_URL = "http://studio.example.test";
  vars.TTS_API_URL = "not a URL";
  vars.CLIP_WEBHOOK_SECRET = "too-short";

  assert.deepEqual(validateEnv(vars), [
    { name: "APP_URL", message: "must use https in production" },
    { name: "CLIP_WEBHOOK_SECRET", message: "length 9, needs 32 or more" },
    { name: "TTS_API_URL", message: "not a valid absolute URL" },
  ]);
});

test("requires PostgreSQL for DATABASE_URL", () => {
  const vars = validEnv();
  vars.DATABASE_URL = "https://db.example.test";

  assert.deepEqual(
    validateEnv(vars).filter(({ name }) => name === "DATABASE_URL"),
    [{ name: "DATABASE_URL", message: "must use postgres or postgresql" }],
  );
});

test("rejects whitespace around values", () => {
  const vars = validEnv();
  vars.FAL_KEY = " key ";

  assert.deepEqual(
    validateEnv(vars).filter(({ name }) => name === "FAL_KEY"),
    [{ name: "FAL_KEY", message: "has leading or trailing whitespace" }],
  );
});
