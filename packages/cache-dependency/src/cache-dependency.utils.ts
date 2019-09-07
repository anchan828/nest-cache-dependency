import { CACHE_DEPENDENCY_PREFIX_CACHE_KEY } from "./constants";

export const createDependenciesCacheKey = (key: string): string => `${CACHE_DEPENDENCY_PREFIX_CACHE_KEY}${key}`;
