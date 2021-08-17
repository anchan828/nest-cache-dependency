import { CacheManager, CacheManagerSetOptions, isNullOrUndefined } from "@anchan828/nest-cache-common";
import { CACHE_MANAGER, Inject, Injectable, Logger } from "@nestjs/common";
import { DepGraph } from "dependency-graph";
import { CacheDependencyEventEmitter } from "./cache-dependency.emitter";
import {
  CacheDependencyGraph,
  CacheDependencyModuleOptions,
  CreateCacheDependencyFunction,
} from "./cache-dependency.interface";
import { createDependenciesCacheKey } from "./cache-dependency.utils";
import { CACHE_DEPENDENCY_MODULE, CACHE_DEPENDENCY_MODULE_OPTIONS } from "./constants";
/**
 * Access to cache manager and dependency
 *
 * @export
 * @class CacheDependencyService
 */
@Injectable()
export class CacheDependencyService {
  private readonly logger = new Logger(CACHE_DEPENDENCY_MODULE);

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: CacheManager,
    @Inject(CACHE_DEPENDENCY_MODULE_OPTIONS)
    private readonly options: CacheDependencyModuleOptions,
    private readonly emitter: CacheDependencyEventEmitter,
  ) {
    emitter.on("delete", (keys) => this.deleteWithoutEvent(...keys));
  }

  /**
   * Get cache from store
   * @deprecated Use get instead of getCache
   * @template T
   * @param {string} key
   * @returns {Promise<T>}
   * @memberof CacheDependencyService
   */
  public async getCache<T>(key: string): Promise<T | undefined> {
    return this.get<T>(key);
  }

  /**
   * Set cache to store. ttl is 999999 for now.
   * @deprecated Use set instead of setCache
   * @param {string} key
   * @param {unknown} value
   * @returns {Promise<void>}
   * @memberof CacheDependencyService
   */
  public async setCache(key: string, value: unknown, ttl?: number): Promise<void> {
    await this.set(key, value, ttl);
  }

  /**
   * Delete cache from store
   * @deprecated Use delete instead of deleteCache
   * @param {string} keys
   * @returns {Promise<void>}
   * @memberof CacheDependencyService
   */
  public async deleteCache(...keys: string[]): Promise<void> {
    await this.delete(...keys);
  }

  /**
   * Get cache from store
   * @template T
   * @param {string} key
   * @returns {Promise<T>}
   * @memberof CacheDependencyService
   */
  public async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(this.toKey(key));
  }

  /**
   * Get caches
   *
   * @param {string[]} keys
   * @return {*}  {(Promise<(T | undefined)[]>)}
   * @memberof CacheDependencyService
   */
  public async mget<T>(keys: string[]): Promise<Record<string, T | undefined>> {
    if (keys.length === 0) {
      return {};
    }

    const result: Record<string, T | undefined> = {};
    const caches = await this.cacheManager.mget<T>(...keys.map((k) => this.toKey(k)));
    for (let i = 0; i < keys.length; i++) {
      result[keys[i]] = caches[i];
    }

    return result;
  }

  /**
   * Set caches
   *
   * @param {(Record<string, T | undefined>)} values kay-value pair
   * @return {*}  {Promise<void>}
   * @memberof CacheDependencyService
   */
  public async mset<T>(values: Record<string, T | undefined>): Promise<void> {
    const keyOrValues: (string | T)[] = [];

    for (const [key, value] of Object.entries(values)) {
      if (!isNullOrUndefined(value)) {
        keyOrValues.push(this.toKey(key), value);
      }
    }

    if (keyOrValues.length === 0) {
      return;
    }

    await this.cacheManager.mset<T>(...keyOrValues);
  }

  /**
   * Set cache to store. ttl is 999999 for now.
   *
   * @param {string} key
   * @param {unknown} value
   * @returns {Promise<void>}
   * @memberof CacheDependencyService
   */
  public async set(key: string, value: unknown, ttl?: number): Promise<void> {
    if (isNullOrUndefined(value)) {
      this.logger.debug(`cache manager doesn't store 'value' because 'value' is undefined.`);
      return;
    }

    if (typeof key !== "string") {
      this.logger.debug(`cache manager doesn't store 'value' because 'key' is undefined.`);
      return;
    }

    const options: CacheManagerSetOptions = {};

    if (ttl) {
      options.ttl = ttl;
    }

    await this.cacheManager.set(this.toKey(key), value, options);
  }

  /**
   * Delete cache from store
   * @param {string} keys
   * @returns {Promise<void>}
   * @memberof CacheDependencyService
   */
  public async delete(...keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    await this.cacheManager.del(...keys.map((k) => this.toKey(k)));
    this.emitter.emit("deleted", keys);
  }

  /**
   * Get keys
   *
   * @param {string} [pattern]
   * @returns {Promise<string[]>}
   * @memberof CacheDependencyService
   */
  public async getKeys(pattern?: string): Promise<string[]> {
    return (await this.cacheManager.keys(pattern))
      .sort()
      .map((k) =>
        this.options.cacheDependencyVersion
          ? k.replace(new RegExp(`^(${this.options.cacheDependencyVersion}?):`), "")
          : k,
      );
  }

  /**
   * Get key/value pairs
   *
   * @param {string} [pattern]
   * @return {*}  {Promise<Record<string, any>>}
   * @memberof CacheDependencyService
   */
  public async getEntries(pattern?: string): Promise<Record<string, any>> {
    return this.mget(await this.getKeys(pattern));
  }

  /**
   * Create graph object
   *
   * @return {*}  {CacheDependencyGraph}
   * @memberof CacheDependencyService
   */
  public createGraph(): CacheDependencyGraph {
    return new DepGraph<any>();
  }

  /**
   * Create dependency graph.
   * If node has data, save it.
   *
   * @param {(CacheDependencyGraph | CreateCacheDependencyFunction)} graph
   * @returns {Promise<void>}
   * @memberof CacheDependencyService
   */
  public async createCacheDependencies(graph: CacheDependencyGraph | CreateCacheDependencyFunction): Promise<void> {
    if (typeof graph === "function") {
      const g = new DepGraph<any>();
      graph(g);
      graph = g;
    }

    const values: (string | any)[] = [];
    const ttlValues: (string | any)[] = [];
    const dependenciesCacheKeys: Record<string, string[]> = {};
    const keys = graph.overallOrder();
    for (const key of keys) {
      const value = graph.getNodeData(key);

      if (!isNullOrUndefined(value) && typeof key === "string" && value !== key) {
        values.push(key, value);
      }

      const dependencies = graph.dependenciesOf(key);
      const dependenciesCacheKey = createDependenciesCacheKey(key);
      dependenciesCacheKeys[dependenciesCacheKey] = dependencies;
    }

    const dependenciesCacheKeyValues = await this.mget<string[]>(Object.keys(dependenciesCacheKeys));

    for (const entry of Object.entries(dependenciesCacheKeyValues)) {
      if (!Array.isArray(entry[1])) {
        entry[1] = [];
      }
      const newDependenciesCacheKeys = Array.from(new Set([...entry[1], ...dependenciesCacheKeys[entry[0]]]));
      if (newDependenciesCacheKeys.length !== 0 && !this.stringArrayEquals(entry[1], newDependenciesCacheKeys)) {
        if (typeof entry[0] === "string") {
          ttlValues.push(entry[0], newDependenciesCacheKeys);
        }
      }
    }
    if (values.length !== 0) {
      await this.cacheManager.mset<any>(...this.toKeyOrValues(values));
    }

    if (ttlValues.length !== 0) {
      await this.cacheManager.mset<any>(...this.toKeyOrValues(ttlValues), {
        options: { ttl: -1 },
      });
    }
  }

  /**
   * Get all dependency keys of key
   *
   * @param {string} key
   * @returns {Promise<string[]>}
   * @memberof CacheDependencyService
   */
  public async getCacheDependencyKeys(key: string): Promise<string[]> {
    const dependencyKeys: string[] = [];
    const dependenciesCacheKey = createDependenciesCacheKey(key);

    const values = (await this.get<string[]>(dependenciesCacheKey)) as string[];
    if (Array.isArray(values)) {
      for (const value of values) {
        dependencyKeys.push(...(await this.getCacheDependencyKeys(value)));
      }
    }

    dependencyKeys.push(key, dependenciesCacheKey);

    return Array.from(new Set(dependencyKeys)).sort();
  }

  /**
   * Clear dependencies of key.
   * If key have cache, delete it.
   * If dependency keys have cache, delete them.
   * @param {string} key
   * @returns {Promise<void>}
   * @memberof CacheDependencyService
   */
  public async clearCacheDependencies(key: string): Promise<void> {
    const cacheKeys = await this.getCacheDependencyKeys(key);
    await this.delete(...cacheKeys);
  }

  /**
   * This method is internal delete method for pubsub
   */
  private async deleteWithoutEvent(...keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    await this.cacheManager.del(...keys.map((k) => this.toKey(k)));
  }

  /**
   * Is it the same string array?
   */
  private stringArrayEquals(a: string[], b: string[]): boolean {
    return JSON.stringify(a.sort()) === JSON.stringify(b.sort());
  }

  private toKey(key: string): string {
    if (!this.options.cacheDependencyVersion) {
      return key;
    }

    return `${this.options.cacheDependencyVersion}:${key}`;
  }

  private toKeyOrValues(keyOrValues: any[]): any {
    if (!this.options.cacheDependencyVersion) {
      return keyOrValues;
    }

    return keyOrValues.map((kv, i) => {
      if (typeof kv !== "string") {
        return kv;
      }
      return i % 2 ? kv : `${this.options.cacheDependencyVersion}:${kv}`;
    });
  }
}
