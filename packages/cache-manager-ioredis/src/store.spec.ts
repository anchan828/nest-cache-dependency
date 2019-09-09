import { caching } from "cache-manager";
import { redisStore } from "./store";
describe("RedisStore", () => {
  it("create cache instance", () => {
    expect(
      caching({
        store: redisStore,
        host: process.env.REDIS_HOST || "localhost",
      } as any),
    ).toBeDefined();
  });

  it("should manage cache", async () => {
    const cache = caching({
      store: redisStore,
      host: process.env.REDIS_HOST || "localhost",
      db: 10,
    } as any);

    const key = "test";
    const date = new Date();
    await cache.set(
      key,
      {
        id: 1,
        name: "Name",
        date,
        nest: {
          id: 10,
          date,
        },
      },
      100,
    );

    await expect(cache.get(key)).resolves.toEqual({
      id: 1,
      name: "Name",
      date,
      nest: {
        id: 10,
        date,
      },
    });

    await expect(cache.del(key)).resolves.toBeUndefined();
    await expect(cache.get(key)).resolves.toBeUndefined();
  });
});
