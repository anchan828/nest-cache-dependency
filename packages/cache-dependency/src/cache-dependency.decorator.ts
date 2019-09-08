import { SetMetadata } from "@nestjs/common";
import { CacheDependencyFunction } from "./cache-dependency.interface";
import { CACHE_DEPENDENCY_KEY_METADATA, CLEAR_CACHE_DEPENDENCIES_KEY_MATADATA } from "./constants";
export const CacheDependency = <T>(func: CacheDependencyFunction<T>): Function =>
  SetMetadata(CACHE_DEPENDENCY_KEY_METADATA, func);

export const ClearCacheDependencies = (cacheKey: string): Function =>
  SetMetadata(CLEAR_CACHE_DEPENDENCIES_KEY_MATADATA, cacheKey);
