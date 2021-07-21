import { CacheModuleOptions } from "@nestjs/common";
import { DepGraph } from "dependency-graph";

/**
 * Wraps dependency-graph
 */
export type CacheDependencyGraph = DepGraph<any>;
export type CacheDependencyFunction<T> = (cacheKey: string, o: T, graph: CacheDependencyGraph) => void;
export type CreateCacheDependencyFunction = (graph: CacheDependencyGraph) => void | Promise<void>;

export interface CacheDependencyModuleOptions extends CacheModuleOptions {
  /**
   * Set version if you want to set prefix string as version
   * e.g. {version}:key
   * @type {string}
   * @memberof CacheDependencyModuleOptions
   */
  cacheDependencyVersion?: string;
}
