import { Cache } from "cache-manager";
import { DepGraph } from "dependency-graph";

/**
 * Wraps dependency-graph
 */
export type CacheDependencyGraph = DepGraph<any>;
export type CacheDependencyFunction<T> = (cacheKey: string, o: T, graph: CacheDependencyGraph) => void;
export type CreateCacheDependencyFunction = (graph: CacheDependencyGraph) => void | Promise<void>;

export type CacheManager = Cache & { keys: (callback: (err: Error, keys: string[]) => void) => void };
