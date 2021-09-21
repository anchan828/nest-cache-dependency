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
        max: Number.MAX_SAFE_INTEGER,
        maxAge: (args.inMemoryTTL || args.inMemory?.ttl || 5) * 1000,
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

    if (this.memoryCache && !key.startsWith(CACHE_DEPENDENCY_PREFIX_CACHE_KEY)) {
      this.memoryCache.set(key, value);
    }

    const json = JSON.stringify(value);

    let ttl: number | undefined;

    if (options && options.ttl) {
      ttl = options.ttl;
    } else if (this.args.ttl) {
      ttl = this.args.ttl;
    }

    if (ttl !== undefined && ttl !== null && ttl !== -1) {
      await this.redisCache.setex(key, ttl, json);
    } else {
      await this.redisCache.set(key, json);
    }
  }

  @CallbackDecorator()
  public async get<T>(key: string): Promise<T | undefined> {
    let result: T | null | undefined;
    if (this.memoryCache && !key.startsWith(CACHE_DEPENDENCY_PREFIX_CACHE_KEY)) {
      result = this.memoryCache.get(key);
    }

    if (!isNullOrUndefined(result)) {
      return result;
    }

    const rawResult = await this.redisCache.get(key);

    if (isNullOrUndefined(rawResult)) {
      return;
    }

    result = parseJSON<T>(rawResult);

    if (this.memoryCache && !key.startsWith(CACHE_DEPENDENCY_PREFIX_CACHE_KEY)) {
      this.memoryCache.set(key, result);
    }

    return result;
  }

  @DelCallbackDecorator()
  public async del(...keys: string[]): Promise<void> {
    if (this.memoryCache) {
      keys.forEach((key) => this.memoryCache?.del(key));
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
      this.memoryCache.reset();
    }
    const keys = await this.keys();
    if (keys.length !== 0) {
      await this.del(...keys.map((key) => key.replace(new RegExp(`^${this.args.keyPrefix}`), "")));
    }
  }

  @CallbackDecorator()
  public async mget<T>(...keys: string[]): Promise<Array<T | undefined>> {
    const map = new Map<string, T | undefined>(keys.map((key) => [key, undefined]));

    if (this.memoryCache) {
      for (const key of keys) {
        if (!key.startsWith(CACHE_DEPENDENCY_PREFIX_CACHE_KEY)) {
          const result = this.memoryCache.get(key);
          map.set(key, result);
        }
      }
    }

    const notFoundKeys = [...map.keys()].filter((key) => map.get(key) === undefined);

    if (notFoundKeys.length !== 0) {
      const results = (await this.redisCache.mget(...notFoundKeys)) as Array<string | undefined>;

      for (let index = 0; index < notFoundKeys.length; index++) {
        if (results[index] !== undefined && results[index] !== null) {
          map.set(notFoundKeys[index], parseJSON<T>(results[index]));
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

        if (this.memoryCache && !key.startsWith(CACHE_DEPENDENCY_PREFIX_CACHE_KEY)) {
          this.memoryCache.set(key, value);
        }

        const json = JSON.stringify(value);

        let ttl: number | undefined;

        if (options && options.ttl) {
          ttl = options.ttl;
        } else if (this.args.ttl) {
          ttl = this.args.ttl;
        }

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
    if (this.args.enabledInMemory && this.memoryCacheIntervalId) {
      this.memoryCache?.reset();
      clearInterval(this.memoryCacheIntervalId);
    }
  }

  private isObject(value: any): value is Object {
    return value instanceof Object && value.constructor === Object;
  }
}

export const redisStore: CacheStoreFactory = {
  create: (args: LiteralObject): CacheStore => new RedisStore(args),
};
