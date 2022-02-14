/* eslint-disable prefer-rest-params */
import {
  CacheManager,
  CacheManagerSetOptions,
  CACHE_DEPENDENCY_PREFIX_CACHE_KEY,
  isNullOrUndefined,
  parseJSON,
} from "@anchan828/nest-cache-common";
import { CacheStore, CacheStoreFactory, LiteralObject } from "@nestjs/common";
import * as Redis from "ioredis";
import * as LRUCache from "lru-cache";
import { CACHE_STORE_NAME } from "./constants";
import { CallbackDecorator, DelCallbackDecorator } from "./store.decorator";
import { RedisStoreArgs } from "./store.interface";
export class RedisStore implements CacheManager {
  private readonly redisCache: Redis.Redis;

  public readonly name: string = CACHE_STORE_NAME;

  private readonly memoryCache?: LRUCache<string, any>;

  private readonly memoryCacheIntervalId?: NodeJS.Timeout;

  constructor(private readonly args: RedisStoreArgs) {
    if (args.enabledInMemory || args.inMemory?.enabled) {
      this.memoryCache = new LRUCache<string, any>({
        max: args.inMemory?.max || Math.pow(2, 16),
        maxSize: args.inMemory?.max || Math.pow(2, 16),
        ttl: (args.inMemoryTTL || args.inMemory?.ttl || 5) * 1000,
      });

      this.memoryCacheIntervalId = setInterval(
        () => this.memoryCache?.prune(),
        args.inMemory?.pruneInterval || 1000 * 10,
      );
    }
    this.redisCache = new Redis(args);
  }

  @CallbackDecorator()
  public async set<T = any>(key: string, value: T, options?: CacheManagerSetOptions): Promise<void> {
    if (value === undefined || value === null) {
      return;
    }

    let ttl: number | undefined;

    if (options && options.ttl) {
      ttl = options.ttl;
    } else if (this.args.ttl) {
      ttl = this.args.ttl;
    }

    const json = JSON.stringify(value);

    if (ttl !== undefined && ttl !== null && ttl !== -1) {
      await this.redisCache.setex(key, ttl, json);
    } else {
      await this.redisCache.set(key, json);
    }

    if (this.enableMemoryCache(this.memoryCache, key) && ttl !== 0) {
      this.memoryCache.set(key, value, { ttl: this.getImMemoryTTL(ttl) });
      await this.args.inMemory?.setCache?.(key, value, ttl);
    }
  }

  @CallbackDecorator()
  public async get<T>(key: string): Promise<T | undefined> {
    let result: T | null | undefined;
    if (this.enableMemoryCache(this.memoryCache, key)) {
      result = this.memoryCache.get(key);
    }

    if (!isNullOrUndefined(result)) {
      await this.args.inMemory?.hitCache?.(key);
      return result;
    }

    const rawResult = await this.redisCache.get(key);

    if (isNullOrUndefined(rawResult)) {
      return;
    }

    result = parseJSON<T>(rawResult);

    if (this.enableMemoryCache(this.memoryCache, key)) {
      const ttl = await this.redisCache.ttl(key);
      if (ttl !== 0) {
        this.memoryCache.set(key, result, { ttl: this.getImMemoryTTL(ttl) });
        await this.args.inMemory?.setCache?.(key, result, ttl);
      }
    }

    return result;
  }

  @DelCallbackDecorator()
  public async del(...keys: string[]): Promise<void> {
    if (this.memoryCache) {
      keys.forEach((key) => this.memoryCache?.delete(key));
    }
    await this.redisCache.del(...keys);
  }

  @CallbackDecorator()
  public async keys(pattern?: string): Promise<string[]> {
    if (!pattern) {
      pattern = "*";
    }
    const keys = await this.redisCache.keys(pattern);
    if (!Array.isArray(keys)) {
      return [];
    }
    return keys.sort();
  }

  @DelCallbackDecorator()
  public async reset(): Promise<void> {
    if (this.memoryCache) {
      this.memoryCache.clear();
    }
    const keys = await this.keys();
    if (keys.length !== 0) {
      await this.del(...keys.map((key) => key.replace(new RegExp(`^${this.args.keyPrefix}`), "")));
    }
  }

  @CallbackDecorator()
  public async mget<T>(...keys: string[]): Promise<Array<T | undefined>> {
    const map = new Map<string, T | undefined>(keys.map((key) => [key, undefined]));

    for (const key of keys) {
      if (this.enableMemoryCache(this.memoryCache, key)) {
        const result = this.memoryCache.get(key);
        map.set(key, result);
        await this.args.inMemory?.hitCache?.(key);
      }
    }

    const notFoundKeys = [...map.keys()].filter((key) => map.get(key) === undefined);

    if (notFoundKeys.length !== 0) {
      const results = (await this.redisCache.mget(...notFoundKeys)) as Array<string | undefined>;

      for (let index = 0; index < notFoundKeys.length; index++) {
        if (results[index] !== undefined && results[index] !== null) {
          const key = notFoundKeys[index];
          const value = parseJSON<T>(results[index]);
          map.set(key, value);

          if (this.enableMemoryCache(this.memoryCache, key)) {
            const ttl = await this.redisCache.ttl(key);
            if (ttl !== 0) {
              this.memoryCache.set(key, value, { ttl: this.getImMemoryTTL(ttl) });
              await this.args.inMemory?.setCache?.(key, value, ttl);
            }
          }
        }
      }
    }
    return [...map.values()];
  }

  @CallbackDecorator()
  public async mset<T>(...keyOrValues: Array<string | T | CacheManagerSetOptions>): Promise<void> {
    let options: CacheManagerSetOptions | undefined;

    if (keyOrValues.length % 2 > 0 && this.isObject(keyOrValues[keyOrValues.length - 1])) {
      options = keyOrValues[keyOrValues.length - 1] as CacheManagerSetOptions;
    }
    const pipeline = this.redisCache.pipeline();
    for (let i = 0; i < keyOrValues.length; i += 2) {
      if (keyOrValues.length !== i + 1) {
        const key = keyOrValues[i] as string;
        const value = keyOrValues[i + 1];
        if (typeof key !== "string") {
          continue;
        }

        if (value === undefined || value === null) {
          continue;
        }

        let ttl: number | undefined;

        if (options && options.ttl) {
          ttl = options.ttl;
        } else if (this.args.ttl) {
          ttl = this.args.ttl;
        }

        if (this.enableMemoryCache(this.memoryCache, key)) {
          this.memoryCache.set(key, value, { ttl: this.getImMemoryTTL(ttl) });
          await this.args.inMemory?.setCache?.(key, value, ttl);
        }

        const json = JSON.stringify(value);

        if (ttl !== undefined && ttl !== null && ttl !== -1) {
          pipeline.setex(key, ttl, json);
        } else {
          pipeline.set(key, json);
        }
      }
    }
    await pipeline.exec();
  }

  public async close(): Promise<void> {
    await this.redisCache.quit();
    if (this.args.enabledInMemory || this.args.inMemory?.enabled) {
      this.memoryCache?.clear();
      if (this.memoryCacheIntervalId) {
        clearInterval(this.memoryCacheIntervalId);
      }
    }
  }

  private isObject(value: any): value is Object {
    return value instanceof Object && value.constructor === Object;
  }

  private enableMemoryCache(
    memoryCache: LRUCache<string, any> | undefined,
    key: string,
  ): memoryCache is LRUCache<string, any> {
    if (key.startsWith(CACHE_DEPENDENCY_PREFIX_CACHE_KEY)) {
      return false;
    }

    return !!memoryCache;
  }

  private getImMemoryTTL(redisTTL?: number): number {
    if (redisTTL === -1) {
      redisTTL = Number.MAX_SAFE_INTEGER;
    }

    const ttl = Math.max(0, redisTTL || 0);
    return Math.min(ttl, this.args.inMemoryTTL || this.args.inMemory?.ttl || 5) * 1000;
  }
}

export const redisStore: CacheStoreFactory = {
  create: (args: LiteralObject): CacheStore => new RedisStore(args),
};
