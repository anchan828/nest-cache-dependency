/* eslint-disable prefer-rest-params */
import {
  CacheManager,
  CacheManagerGetOptions,
  CacheManagerSetOptions,
  CACHE_DEPENDENCY_PREFIX_CACHE_KEY,
  chunk,
  isNullOrUndefined,
  parseJSON,
} from "@anchan828/nest-cache-common";
import { CacheStore, CacheStoreFactory, LiteralObject } from "@nestjs/common";
import Redis from "ioredis";
import { CACHE_STORE_NAME } from "./constants";
import { InMemoryCacheService } from "./in-memory-cache.service";
import { CallbackDecorator, DelCallbackDecorator } from "./store.decorator";
import { RedisStoreArgs } from "./store.interface";
export class RedisStore implements CacheManager {
  private readonly redisCache: Redis;

  public readonly name: string = CACHE_STORE_NAME;

  private readonly memoryCache?: InMemoryCacheService;

  private readonly memoryCacheIntervalId?: NodeJS.Timeout;

  constructor(private readonly args: RedisStoreArgs) {
    if (args.enabledInMemory || args.inMemory?.enabled) {
      this.memoryCache = new InMemoryCacheService({
        max: args.inMemory?.max ?? Math.pow(2, 16),
        maxSize: args.inMemory?.max ?? Math.pow(2, 16),
        ttl: (args.inMemoryTTL ?? args.inMemory?.ttl ?? 5) * 1000,
        sizeCalculation: () => 1,
      });

      this.memoryCacheIntervalId = setInterval(
        () => this.memoryCache?.purgeStale(),
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

    if (options && !isNullOrUndefined(options.ttl)) {
      ttl = options.ttl;
    } else if (!isNullOrUndefined(this.args.ttl)) {
      ttl = this.args.ttl;
    }

    if (ttl === 0) {
      return;
    }

    const json = JSON.stringify(value);

    if (ttl !== undefined && ttl !== null && ttl !== -1) {
      this.redisCache.setex(key, ttl, json);
    } else {
      this.redisCache.set(key, json);
    }

    await this.args.setCache?.(key, json, ttl);

    const inMemoryTTL = options?.inMmeoryTTL ?? ttl;

    if (this.enableMemoryCache(this.memoryCache, key) && inMemoryTTL !== 0) {
      const cachedValue = this.memoryCache.set(key, value, { ttl: this.getImMemoryTTL(ttl) });
      await this.args.inMemory?.setCache?.(key, cachedValue, ttl);
    }
  }

  @CallbackDecorator()
  public async get<T>(key: string, options?: CacheManagerGetOptions): Promise<T | undefined> {
    if (typeof key !== "string") {
      return;
    }

    let result: T | null | undefined;

    let redisTTL = -2;

    if (this.enableMemoryCache(this.memoryCache, key) && options?.inMmeoryTTL !== 0) {
      redisTTL = await this.redisCache.ttl(key);
    }

    if (this.enableMemoryCache(this.memoryCache, key) && options?.inMmeoryTTL !== 0) {
      if (redisTTL !== -2) {
        result = this.memoryCache.get(key);
      }
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

    if (this.enableMemoryCache(this.memoryCache, key) && options?.inMmeoryTTL !== 0) {
      if (redisTTL !== -2) {
        const cachedValue = this.memoryCache.set(key, result, { ttl: this.getImMemoryTTL(redisTTL) });
        await this.args.inMemory?.setCache?.(key, cachedValue, redisTTL);
      }
    }
    await this.args.hitCache?.(key);
    return result;
  }

  @DelCallbackDecorator()
  public async del(...keys: string[]): Promise<void> {
    if (this.memoryCache) {
      for (const key of keys) {
        if (this.memoryCache?.delete(key)) {
          await this.args.inMemory?.deleteCache?.(key);
        }
      }
    }

    for (const deleteKeys of chunk(keys, 2000)) {
      await this.redisCache.del(...deleteKeys);
      for (const key of deleteKeys) {
        await this.args.deleteCache?.(key);
      }
    }
  }

  @CallbackDecorator()
  public async keys(pattern?: string): Promise<string[]> {
    const results: string[] = [];
    if (!pattern) {
      pattern = "*";
    }

    for await (const keys of this.redisCache.scanStream({ match: pattern, count: 100 })) {
      results.push(...keys);
    }

    return results.sort();
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
  public async mget<T>(
    ...keysOrOptions: string[] | [...string[], CacheManagerGetOptions | undefined]
  ): Promise<Array<T | undefined>> {
    const keys = keysOrOptions.filter((x): x is string => typeof x === "string") as string[];
    const options = keysOrOptions.find((x): x is CacheManagerGetOptions => typeof x === "object") as
      | CacheManagerGetOptions
      | undefined;

    const map = new Map<string, T | undefined>(keys.map((key) => [key, undefined]));

    for (const key of keys) {
      if (typeof key !== "string") {
        continue;
      }

      if (this.enableMemoryCache(this.memoryCache, key) && options?.inMmeoryTTL !== 0) {
        const existsKey = await this.redisCache.exists(key);
        if (existsKey) {
          const result = this.memoryCache.get<T>(key);
          if (!isNullOrUndefined(result)) {
            map.set(key, result);
            await this.args.inMemory?.hitCache?.(key);
          }
        }
      }
    }

    const notFoundKeys = [...map.keys()].filter((key) => map.get(key) === undefined);

    if (notFoundKeys.length !== 0) {
      const results: Array<string | undefined> = [];

      for (const keys of chunk(notFoundKeys, 2000)) {
        results.push(...((await this.redisCache.mget(...keys)) as Array<string | undefined>));
      }

      for (let index = 0; index < notFoundKeys.length; index++) {
        if (results[index] !== undefined && results[index] !== null) {
          const key = notFoundKeys[index];
          const value = parseJSON<T>(results[index]);
          map.set(key, value);

          await this.args.hitCache?.(key);

          if (this.enableMemoryCache(this.memoryCache, key) && options?.inMmeoryTTL !== 0) {
            const ttl = await this.redisCache.ttl(key);
            if (ttl !== 0) {
              const cachedValue = this.memoryCache.set(key, value, { ttl: this.getImMemoryTTL(ttl) });
              await this.args.inMemory?.setCache?.(key, cachedValue, ttl);
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

        if (options && !isNullOrUndefined(options.ttl)) {
          ttl = options.ttl;
        } else if (!isNullOrUndefined(this.args.ttl)) {
          ttl = this.args.ttl;
        }

        if (ttl === 0) {
          continue;
        }

        const json = JSON.stringify(value);

        if (ttl !== undefined && ttl !== null && ttl !== -1) {
          this.redisCache.setex(key, ttl, json);
        } else {
          this.redisCache.set(key, json);
        }

        await this.args.setCache?.(key, json, ttl);

        const inMemoryTTL = options?.inMmeoryTTL ?? ttl;

        if (this.enableMemoryCache(this.memoryCache, key) && inMemoryTTL !== 0) {
          const cachedValue = this.memoryCache.set(key, value, { ttl: this.getImMemoryTTL(ttl) });
          await this.args.inMemory?.setCache?.(key, cachedValue, ttl);
        }
      }
    }
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
    memoryCache: InMemoryCacheService | undefined,
    key: string,
  ): memoryCache is InMemoryCacheService {
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
