"use client";

import { parseAsString, createSearchParamsCache } from "nuqs/server";

export const imageGenerationsSearchParams = {
  query: parseAsString.withDefault(""),
};

export const imageGenerationsSearchParamsCache = createSearchParamsCache(
  imageGenerationsSearchParams,
);

