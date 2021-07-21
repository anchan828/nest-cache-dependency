import { CacheModuleOptions, ModuleMetadata, Provider, Type } from "@nestjs/common";
import { DepGraph } from "dependency-graph";

/**
 * Wraps dependency-graph
 */
export type CacheDependencyGraph = DepGraph<any>;
export type CacheDependencyFunction<T> = (cacheKey: string, o: T, graph: CacheDependencyGraph) => void;
export type CreateCacheDependencyFunction = (graph: CacheDependencyGraph) => void | Promise<void>;

export interface CacheDependencyModuleOptions extends CacheModuleOptions {
  /**
   * Set if you want to set key to prefix string as version
   * e.g. {version}:key
   * @type {string}
   * @memberof CacheDependencyModuleOptions
   */
  cacheDependencyVersion?: string;
}

export interface CacheDependencyModuleOptionsFactory {
  createCacheOptions(): Promise<CacheDependencyModuleOptions> | CacheDependencyModuleOptions;
}
export interface CacheDependencyModuleAsyncOptions extends Pick<ModuleMetadata, "imports"> {
  useExisting?: Type<CacheDependencyModuleOptionsFactory>;
  useClass?: Type<CacheDependencyModuleOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<CacheDependencyModuleOptions> | CacheDependencyModuleOptions;
  inject?: any[];
  extraProviders?: Provider[];
}
