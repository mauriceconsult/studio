import { parseAsString, createSearchParamsCache } from "nuqs/server";

export const coursesSearchParams = {
  query: parseAsString.withDefault(""),
};

export const coursesSearchParamsCache = createSearchParamsCache(coursesSearchParams);
