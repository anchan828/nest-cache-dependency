import { CacheManager } from "@anchan828/nest-cache-common";
import { caching } from "cache-manager";
import { redisStore } from "./store";
describe("RedisStore", () => {
  let store: CacheManager;

  beforeEach(async () => {
    store = (caching({
      store: redisStore,
      host: process.env.REDIS_HOST || "localhost",
      ttl: 5,
    } as any) as any) as CacheManager;
  });

  afterEach(async () => {
    // await (store as any).store.redisCache.flushdb();
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

    await expect(results.sort()).toEqual(["cache:key1", "cache:key2", "cache:key3"]);
  });

  it("should reset cache keys", async () => {
    const keys = ["key1", "key2", "key3"];
    for (const key of keys) {
      await store.set(key, key);
    }
    let results = await store.keys();
    await expect(results.sort()).toEqual(["cache:key1", "cache:key2", "cache:key3"]);
    await store.reset();
    results = await store.keys();
    await expect(results.sort()).toEqual([]);
  });

  it("should change key prefix", async () => {
    store = (caching({
      store: redisStore,
      host: process.env.REDIS_HOST || "localhost",
      ttl: 10,
      db: 2,
      keyPrefix: "changed:",
    } as any) as any) as CacheManager;
    const key = "key";
    await store.set(key, key);
    const results = await store.keys();
    await expect(results.sort()).toEqual(["changed:key"]);
  });

  it("should mget", async () => {
    const keys = ["key1", "key2", "key3"];
    for (const key of keys) {
      await store.set(key, `${key}:value`);
    }

    await expect(store.mget(keys)).resolves.toEqual(["key1:value", "key2:value", "key3:value"]);
  });

  it("should mset", async () => {
    await store.mset("key1", "key1:value", "key2", "key2:value", "key3", "key3:value");

    await expect(store.mget(["key1", "key2", "key3"])).resolves.toEqual(["key1:value", "key2:value", "key3:value"]);
  });
});

describe("In-memory cache", () => {
  let store: CacheManager;

  beforeEach(async () => {
    store = (caching({
      store: redisStore,
      host: process.env.REDIS_HOST || "localhost",
      ttl: 5,
      enabledInMemory: true,
    } as any) as any) as CacheManager;

    await store.reset();
  });

  it("should get from in-memory", async () => {
    const key = "key";
    await store.set(key, key);

    // from redis
    await store.get(key);

    // from in-memory
    await store.get(key);
  });

  it("should get from in-memory", async () => {
    const key = "key";
    await store.set(key, key);

    // from redis
    await store.get(key);

    // from in-memory
    await store.get(key);
  });
});
