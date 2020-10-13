import { CacheManager, CacheManagerSetOptions } from "@anchan828/nest-cache-common";
import { CACHE_MANAGER, Inject, Injectable, Logger } from "@nestjs/common";
import { DepGraph } from "dependency-graph";
import { CacheDependencyGraph, CreateCacheDependencyFunction } from "./cache-dependency.interface";
import { createDependenciesCacheKey } from "./cache-dependency.utils";
import { CACHE_DEPENDENCY_MODULE } from "./constants";

/**
 * Access to cache manager and dependency
 *
 * @export
 * @class CacheDependencyService
 */
@Injectable()
export class CacheDependencyService {
  private readonly logger = new Logger(CACHE_DEPENDENCY_MODULE, true);

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: CacheManager,
  ) {}

  /**
   * Get cache from store
   *
   * @template T
   * @param {string} key
   * @returns {Promise<T>}
   * @memberof CacheDependencyService
   */
  public async getCache<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  /**
   * Set cache to store. ttl is 999999 for now.
   *
   * @param {string} key
   * @param {unknown} value
   * @returns {Promise<void>}
   * @memberof CacheDependencyService
   */
  public async setCache(key: string, value: unknown, ttl?: number): Promise<void> {
    if (!value) {
      this.logger.debug(`cache manager don't store 'value' because 'value' is undefined.`);
      return;
    }

    const options: CacheManagerSetOptions = {};

    if (ttl) {
      options.ttl = ttl;
    }

    await this.cacheManager.set(key, value, options);
  }

  /**
   * Delete cache from store
   *
   * @param {string} keys
   * @returns {Promise<void>}
   * @memberof CacheDependencyService
   */
  public async deleteCache(...keys: string[]): Promise<void> {
    await this.cacheManager.del(...keys);
  }

  /**
   * Get all keys
   *
   * @param {string} [pattern]
   * @returns {Promise<string[]>}
   * @memberof CacheDependencyService
   */
  public async getKeys(pattern?: string): Promise<string[]> {
    return this.cacheManager.keys(pattern);
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
      const g = new DepGraph<any>({ circular: true });
      graph(g);
      graph = g;
    }

    const keys = graph.overallOrder();
    for (const key of keys) {
      const data = graph.getNodeData(key);

      if (data && data !== key) {
        await this.setCache(key, data);
      }

      const dependencies = graph.dependenciesOf(key);
      const dependenciesCacheKey = createDependenciesCacheKey(key);
      let value = (await this.getCache<string[]>(dependenciesCacheKey)) as string[];
      if (!Array.isArray(value)) {
        value = [];
      }

      const newValues = Array.from(new Set([...value, ...dependencies]));
      if (newValues.length !== 0 && !this.arrayEquals(value, newValues)) {
        await this.setCache(dependenciesCacheKey, newValues, Number.MAX_SAFE_INTEGER);
      }
    }
  }

  /**
   * Get all dependency keys of key
   *
   * @param {string} key
   * @param {string[]} [dependencyKeys=[]]
   * @returns {Promise<string[]>}
   * @memberof CacheDependencyService
   */
  public async getCacheDependencyKeys(key: string): Promise<string[]> {
    const dependencyKeys: string[] = [];
    const dependenciesCacheKey = createDependenciesCacheKey(key);

    const values = (await this.getCache<string[]>(dependenciesCacheKey)) as string[];
    if (Array.isArray(values)) {
      for (const value of values) {
        dependencyKeys.push(...(await this.getCacheDependencyKeys(value)));
      }
    }
    dependencyKeys.push(key, dependenciesCacheKey);
    return dependencyKeys;
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
    await this.deleteCache(...cacheKeys);
  }

  /**
   * Is it the same array?
   */
  private arrayEquals<T>(a: T[], b: T[]): boolean {
    return JSON.stringify(a.sort()) === JSON.stringify(b.sort());
  }
}
