import { parseAsString, createSearchParamsCache } from "nuqs/server";

export const videosSearchParams = {
  query: parseAsString.withDefault(""),
};

export const videosSearchParamsCache =
  createSearchParamsCache(videosSearchParams);
