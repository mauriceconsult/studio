import { createSearchParamsCache, parseAsString } from "nuqs/server";

export const coursesSearchParamsCache = createSearchParamsCache({
  query: parseAsString.withDefault(""),
});
