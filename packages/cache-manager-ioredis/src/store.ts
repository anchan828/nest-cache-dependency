import { CacheManager, CacheManagerSetOptions, parseJSON } from "@anchan828/nest-cache-common";
import { CacheStore, CacheStoreFactory, LiteralObject } from "@nestjs/common";
import { caching } from "cache-manager";
import * as Redis from "ioredis";
import { CACHE_KEY_PREFIX, CACHE_STORE_NAME } from "./constants";
import { RedisStoreArgs } from "./store.interface";
class RedisStore implements CacheManager {
  private readonly redisCache: Redis.Redis;

  public readonly name: string = CACHE_STORE_NAME;

  private readonly memoryStore?: CacheManager;

  constructor(private readonly args: RedisStoreArgs) {
    if (!args.keyPrefix) {
      args.keyPrefix = CACHE_KEY_PREFIX;
    }

    if (args.enabledInMemory) {
      this.memoryStore = (caching({
        store: "memory",
        max: Number.MAX_SAFE_INTEGER,
        ttl: args.inMemoryTTL || 5,
      }) as unknown) as CacheManager;
    }
    this.redisCache = new Redis(args);
  }

  public async set(key: any, value: any, options?: CacheManagerSetOptions): Promise<void> {
    const json = JSON.stringify(value) || '"undefined"';

    if (this.memoryStore) {
      await this.memoryStore.del(key);
    }

    if (options && options.ttl) {
      await this.redisCache.setex(key, options.ttl, json);
    } else if (this.args.ttl) {
      await this.redisCache.setex(key, this.args.ttl, json);
    } else {
      await this.redisCache.set(key, json);
    }
  }

  public async get<T>(key: string): Promise<T | undefined> {
    let result: T | null | undefined;
    if (this.memoryStore) {
      result = await this.memoryStore.get(key);
    }

    if (result) {
      return result;
    }

    const rawResult = await this.redisCache.get(key);

    if (!rawResult) {
      return;
    }

    result = parseJSON<T>(rawResult);

    if (this.memoryStore) {
      await this.memoryStore.set(key, result);
    }

    return result;
  }

  public async del(...keys: string[]): Promise<void> {
    if (this.memoryStore) {
      await this.memoryStore.del(...keys);
    }
    await this.redisCache.del(...keys);
  }

  public async keys(pattern?: string): Promise<string[]> {
    if (!pattern) {
      pattern = "*";
    }
    const keys = await this.redisCache.keys(`${this.args.keyPrefix}${pattern}`);
    if (!Array.isArray(keys)) {
      return [];
    }
    return keys;
  }

  public async reset(): Promise<void> {
    if (this.memoryStore) {
      await this.memoryStore.reset();
    }
    const keys = await this.keys();
    if (keys.length !== 0) {
      await this.del(...keys.map(key => key.replace(new RegExp(`^${this.args.keyPrefix}`), "")));
    }
  }

  public async mget<T>(keys: string[]): Promise<Array<T | undefined>> {
    const results = (await this.redisCache.mget(...keys)) as Array<string | undefined>;
    return results.map(result => parseJSON<T>(result));
  }

  public async mset<T>(...keyOrValues: Array<string | T>): Promise<void> {
    for (let i = 0; i < keyOrValues.length; i += 2) {
      await this.set(keyOrValues[i], keyOrValues[i + 1]);
    }
  }
}

export const redisStore: CacheStoreFactory = {
  create: (args: LiteralObject): CacheStore => new RedisStore(args),
};
