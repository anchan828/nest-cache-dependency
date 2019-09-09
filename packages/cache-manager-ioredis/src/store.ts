import { CacheStore, CacheStoreFactory, LiteralObject } from "@nestjs/common";
import * as Redis from "ioredis";
class RedisStore implements CacheStore {
  constructor(private readonly args: LiteralObject, private readonly redisCache: Redis.Redis) {}

  async set(key: any, value: any): Promise<void> {
    const json = JSON.stringify(value) || '"undefined"';

    if (this.args.ttl) {
      await this.redisCache.setex(key, this.args.ttl, json);
    } else {
      await this.redisCache.set(key, json);
    }
  }

  async get<T>(key: string): Promise<T | undefined> {
    const result = await this.redisCache.get(key);

    if (!result) {
      return;
    }

    return JSON.parse(result, (_: string, value: any): any => {
      if (typeof value === "string") {
        const date = Date.parse(value);
        if (!isNaN(date)) {
          return new Date(date);
        }
      }
      return value;
    });
  }

  async del(key: string): Promise<void> {
    await this.redisCache.del(key);
  }
}

export const redisStore: CacheStoreFactory = {
  create: (args: LiteralObject): CacheStore => new RedisStore(args, new Redis(args)),
};
