import { CacheManager } from "@anchan828/nest-cache-common";
import { caching, StoreConfig } from "cache-manager";
import * as Redis from "ioredis";
import { setTimeout } from "timers/promises";
import { RedisStore, redisStore } from "./store";
import { RedisStoreArgs } from "./store.interface";
describe("RedisStore", () => {
  let store: CacheManager;
  let redis: RedisStore;
  beforeEach(async () => {
    store = caching({
      store: redisStore,
      host: process.env.REDIS_HOST || "localhost",
      ttl: 5,
    } as any) as any as CacheManager;
    redis = (store as any).store;
  });

  afterEach(async () => {
    await redis["redisCache"].flushdb();
    await redis.close();
  });

  it("create cache instance", () => {
    expect(store).toBeDefined();
  });

  it("should set cache", async () => {
    const key = "test";
    await store.set(key, {
      id: 1,
      name: "Name",
      nest: {
        id: 10,
      },
    });

    await expect(store.get(key)).resolves.toEqual({
      id: 1,
      name: "Name",
      nest: {
        id: 10,
      },
    });
  });

  it("should set cache with ttl", async () => {
    const key = "test";
    await store.set(key, {
      id: 1,
      name: "Name",
      nest: {
        id: 10,
      },
    });

    await expect(store.get(key)).resolves.toEqual({
      id: 1,
      name: "Name",
      nest: {
        id: 10,
      },
    });
  });

  it("should set ttl", async () => {
    const key = "test";
    await store.set(key, { id: 1 }, { ttl: 10 });
    await expect(redis["redisCache"].ttl(key)).resolves.toBeGreaterThan(5);
  });

  it("should set ttl: -1", async () => {
    const key = "test";
    await store.set(key, { id: 1 }, { ttl: -1 });
    await expect(redis["redisCache"].ttl(key)).resolves.toEqual(-1);
  });

  it("should delete cache", async () => {
    const key = "test";
    await store.set(key, key);
    await expect(store.del(key)).resolves.toBeUndefined();
    await expect(store.get(key)).resolves.toBeUndefined();
  });

  it("should get cache keys", async () => {
    const keys = ["key1", "key2", "key3"];
    for (const key of keys) {
      await store.set(key, key);
    }

    const results = await store.keys();

    expect(results.sort()).toEqual(["key1", "key2", "key3"]);
  });

  it("should reset cache keys", async () => {
    const keys = ["key1", "key2", "key3"];
    for (const key of keys) {
      await store.set(key, key);
    }
    let results = await store.keys();
    expect(results.sort()).toEqual(["key1", "key2", "key3"]);
    await store.reset();
    results = await store.keys();
    expect(results.sort()).toEqual([]);
  });

  it("should change key prefix", async () => {
    const store = caching({
      store: redisStore,
      host: process.env.REDIS_HOST || "localhost",
      ttl: 10,
      db: 2,
      keyPrefix: "changed:",
    } as any) as any as CacheManager;
    const key = "key";
    await store.set(key, key);
    const results = await store.keys();
    expect(results.sort()).toEqual(["changed:key"]);

    const redis = (store as any).store.redisCache as Redis.Redis;
    await redis.quit();
  });

  it("should mget", async () => {
    for (const key of ["key1", "key2", "key4"]) {
      await store.set(key, `${key}:value`);
    }

    await expect(store.mget(...["key1", "key2", "key3", "key4"])).resolves.toEqual([
      "key1:value",
      "key2:value",
      undefined,
      "key4:value",
    ]);
  });

  it("should mset", async () => {
    await store.mset("key1", "key1:value", "key2", "key2:value", "key3", "key3:value", { ttl: 1000 });
    await expect(store.keys()).resolves.toEqual(["key1", "key2", "key3"]);
    await expect(store.mget(...["key1", "key2", "key3"])).resolves.toEqual(["key1:value", "key2:value", "key3:value"]);
  });

  it("should mset with options", async () => {
    await store.mset("key1", "key1:value", "key2", "key2:value", "key3", "key3:value", { ttl: "1234" });
    await expect(store.keys()).resolves.toEqual(["key1", "key2", "key3"]);
    await expect(store.mget(...["key1", "key2", "key3"])).resolves.toEqual(["key1:value", "key2:value", "key3:value"]);
  });
});

describe("In-memory cache", () => {
  let store: CacheManager;
  let redis: RedisStore;
  let hitCacheFn: jest.Mock<any, any>;
  let setCacheFn: jest.Mock<any, any>;
  beforeEach(async () => {
    hitCacheFn = jest.fn();
    setCacheFn = jest.fn();
    store = caching({
      store: redisStore as any,
      host: process.env.REDIS_HOST || "localhost",
      ttl: 5,
      inMemory: {
        enabled: true,
        hitCache: hitCacheFn,
        setCache: setCacheFn,
      },
    } as StoreConfig & RedisStoreArgs) as unknown as CacheManager;

    await store.reset();
    redis = (store as any).store;
  });

  afterEach(async () => {
    await redis["redisCache"].flushdb();
    await redis.close();
  });

  it("should get from in-memory", async () => {
    const key = "key";
    const value = "value";

    expect(hitCacheFn.mock.calls).toEqual([]);
    expect(setCacheFn.mock.calls).toEqual([]);

    await store.set(key, value);

    expect(hitCacheFn.mock.calls).toEqual([]);
    expect(setCacheFn.mock.calls).toEqual([[key, value, 5]]);

    await expect(store.get(key)).resolves.toEqual(value);

    expect(hitCacheFn.mock.calls).toEqual([[key]]);
    expect(setCacheFn.mock.calls).toEqual([[key, value, 5]]);
  });

  it("should clear in-memory cache", async () => {
    const key = "key";
    const value = "value";

    expect(hitCacheFn.mock.calls).toEqual([]);
    expect(setCacheFn.mock.calls).toEqual([]);

    await store.set(key, value, { ttl: 1 });

    expect(hitCacheFn.mock.calls).toEqual([]);
    expect(setCacheFn.mock.calls).toEqual([[key, value, 1]]);

    await expect(store.get(key)).resolves.toEqual(value);

    expect(hitCacheFn.mock.calls).toEqual([[key]]);
    expect(setCacheFn.mock.calls).toEqual([[key, value, 1]]);

    await expect(store.get(key)).resolves.toEqual(value);

    expect(hitCacheFn.mock.calls).toEqual([[key], [key]]);
    expect(setCacheFn.mock.calls).toEqual([[key, value, 1]]);

    await setTimeout(1500);

    await expect(store.get(key)).resolves.toBeUndefined();

    expect(hitCacheFn.mock.calls).toEqual([[key], [key]]);
    expect(setCacheFn.mock.calls).toEqual([[key, value, 1]]);
  });

  it("should use ttl of redis", async () => {
    const key = "key";
    const value = "value";

    expect(hitCacheFn.mock.calls).toEqual([]);
    expect(setCacheFn.mock.calls).toEqual([]);

    await store.set(key, value);

    expect(hitCacheFn.mock.calls).toEqual([]);
    expect(setCacheFn.mock.calls).toEqual([[key, value, 5]]);
    expect(redis["memoryCache"]?.get(key)).toEqual(value);

    redis["memoryCache"]?.clear();

    expect(redis["memoryCache"]?.get(key)).toBeUndefined();

    await setTimeout(1100);

    await expect(store.get(key)).resolves.toEqual(value);

    expect(hitCacheFn.mock.calls).toEqual([]);
    expect(setCacheFn.mock.calls).toEqual([
      [key, value, 5],
      [key, value, expect.any(Number)],
    ]);

    // Redundant checks are performed since the actual measured values vary depending on the machine specs.
    expect(setCacheFn.mock.calls[1][2] < 5).toBeTruthy();
  });
});
