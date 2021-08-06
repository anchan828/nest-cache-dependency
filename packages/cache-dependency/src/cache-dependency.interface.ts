import { CacheModuleOptions, ModuleMetadata, Provider, Type } from "@nestjs/common";
import { DepGraph } from "dependency-graph";
import { RedisOptions } from "ioredis";
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

  /**
   * Sends a message to all instances when the cache has been deleted.
   * Use this when there may be multiple instances, such as Serverless with in-memory cache.
   * @type {RedisOptions}
   * @memberof CacheDependencyModuleOptions
   */
  pubsub?: RedisOptions;
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

export interface CacheDependencyPubSubMessage<T = any> {
  instanceId: string;
  data: T;
}

export interface CacheDependencyDeleteOptions {
  emitEvent: boolean;
}
