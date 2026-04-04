import { createSearchParamsCache, parseAsString } from "nuqs/server";

export const videosSearchParamsCache = createSearchParamsCache({
  query: parseAsString.withDefault(""),
});
