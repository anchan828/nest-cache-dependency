import { DepGraph } from "dependency-graph";

/**
 * Wraps dependency-graph
 */
export type CacheDependencyGraph = DepGraph<any>;
export type CacheDependencyFunction<T> = (cacheKey: string, o: T, graph: CacheDependencyGraph) => void;
export type CreateCacheDependencyFunction = (graph: CacheDependencyGraph) => void | Promise<void>;
