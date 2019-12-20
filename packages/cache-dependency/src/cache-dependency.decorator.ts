import { SetMetadata } from "@nestjs/common";
import { CacheDependencyFunction } from "./cache-dependency.interface";
import { CACHE_DEPENDENCY_KEY_METADATA, CLEAR_CACHE_DEPENDENCIES_KEY_MATADATA } from "./constants";
export const CacheDependency = <T>(func: CacheDependencyFunction<T>): MethodDecorator =>
  SetMetadata(CACHE_DEPENDENCY_KEY_METADATA, func);

export const ClearCacheDependencies = (...cacheKeys: string[]): MethodDecorator =>
  SetMetadata(CLEAR_CACHE_DEPENDENCIES_KEY_MATADATA, cacheKeys);
