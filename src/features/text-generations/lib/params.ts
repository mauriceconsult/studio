import { createSearchParamsCache, parseAsString } from "nuqs/server";

export const textGenerationsSearchParams = {
  query: parseAsString.withDefault(""),
};

export const textGenerationsSearchParamsCache = createSearchParamsCache(
  textGenerationsSearchParams
);
