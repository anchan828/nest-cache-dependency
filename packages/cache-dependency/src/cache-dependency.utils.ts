import { CACHE_DEPENDENCY_PREFIX_CACHE_KEY } from "@anchan828/nest-cache-common";

export const createDependenciesCacheKey = (key: string): string => `${CACHE_DEPENDENCY_PREFIX_CACHE_KEY}${key}`;
