import { CACHE_MANAGER, Inject, Injectable, Logger } from "@nestjs/common";
import { Cache } from "cache-manager";
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

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Get cache from store
   *
   * @template T
   * @param {string} key
   * @returns {Promise<T>}
   * @memberof CacheDependencyService
   */
  public async getCache<T>(key: string): Promise<T> {
    return new Promise((resolve, reject): void => {
      this.cacheManager.get<T>(key, (err, result): void => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Set cache to store. ttl is 999999 for now.
   *
   * @param {string} key
   * @param {unknown} value
   * @returns {Promise<void>}
   * @memberof CacheDependencyService
   */
  public async setCache(key: string, value: unknown): Promise<void> {
    if (!value) {
      this.logger.debug(`value is undefined`);
      return;
    }

    return new Promise((resolve, reject): void => {
      const ttl = 999999;
      this.cacheManager.set(key, value, { ttl }, (err): void => {
        if (err) {
          this.logger.error(err);
          reject(err);
        } else {
          this.logger.debug(`Set cache key: ${key}`);
          resolve();
        }
      });
    });
  }

  /**
   * Delete cache from store
   *
   * @param {string} key
   * @returns {Promise<void>}
   * @memberof CacheDependencyService
   */
  public deleteCache(key: string): Promise<void> {
    return new Promise((resolve, reject): void => {
      this.cacheManager.del(key, (err): void => {
        if (err) {
          this.logger.error(err);
          reject(err);
        } else {
          this.logger.debug(`Deleted cache key: ${key}`);
          resolve();
        }
      });
    });
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

      if (data) {
        await this.setCache(key, data);
      }

      const dependencies = graph.dependenciesOf(key);
      const dependenciesCacheKey = createDependenciesCacheKey(key);
      let value = (await this.getCache<string[]>(dependenciesCacheKey)) as string[];
      if (!Array.isArray(value)) {
        value = [];
      }

      value.push(...dependencies);

      await this.setCache(dependenciesCacheKey, Array.from(new Set(value)));
    }
  }

  /**
   * Clear cache dependency.
   * If key have cache, delete it.
   * If dependency keys have cache, delete them.
   * @param {string} key
   * @returns {Promise<void>}
   * @memberof CacheDependencyService
   */
  public async clearCacheDependencies(key: string): Promise<void> {
    const dependenciesCacheKey = createDependenciesCacheKey(key);
    const values = (await this.cacheManager.get<string[]>(dependenciesCacheKey)) as string[];

    if (!Array.isArray(values)) {
      return;
    }

    for (const value of values) {
      await this.deleteCache(value);
      await this.deleteCache(createDependenciesCacheKey(key));
    }

    await this.deleteCache(key);
    await this.deleteCache(dependenciesCacheKey);
  }
}
