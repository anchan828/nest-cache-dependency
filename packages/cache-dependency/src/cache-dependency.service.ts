import { CACHE_MANAGER, Inject, Injectable } from "@nestjs/common";
import { Cache } from "cache-manager";
import { DepGraph } from "dependency-graph";
import { CacheDependencyGraph, CreateCacheDependencyFunction } from "./cache-dependency.interface";
import { createDependenciesCacheKey } from "./cache-dependency.utils";
import { CACHE_DEPENDENCY_PREFIX_CACHE_KEY } from "./constants";

@Injectable()
export class CacheDependencyService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

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

  public async setCache(key: string, value: unknown): Promise<void> {
    return new Promise((resolve, reject): void => {
      console.log(this.cacheManager);
      const ttl = 999999;
      this.cacheManager.set(key, value, { ttl }, (err): void => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  public deleteCache(key: string): Promise<void> {
    return new Promise((resolve, reject): void => {
      this.cacheManager.del(key, (err): void => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

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
      const dependenciesCacheKey = `${CACHE_DEPENDENCY_PREFIX_CACHE_KEY}${key}`;
      let value = (await this.getCache<string[]>(dependenciesCacheKey)) as string[];
      if (!Array.isArray(value)) {
        value = [];
      }

      value.push(...dependencies);

      await this.setCache(dependenciesCacheKey, Array.from(new Set(value)));
    }
  }

  public async clearCacheDependencies(key: string): Promise<void> {
    const dependenciesCacheKey = `${CACHE_DEPENDENCY_PREFIX_CACHE_KEY}${key}`;
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
