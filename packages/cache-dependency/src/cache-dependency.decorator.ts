import { SetMetadata } from "@nestjs/common";
import { CacheDependencyFunction } from "./cache-dependency.interface";
import { CACHE_DEPENDENCY_KEY_METADATA } from "./constants";
export const CacheDependency = <T>(func: CacheDependencyFunction<T>): Function =>
  SetMetadata(CACHE_DEPENDENCY_KEY_METADATA, func);
