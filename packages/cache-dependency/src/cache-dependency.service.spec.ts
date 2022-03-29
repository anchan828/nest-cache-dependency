import { redisStore } from "@anchan828/nest-cache-manager-ioredis";
import { CACHE_MANAGER } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { caching } from "cache-manager";
import { CacheDependencyEventEmitter } from "./cache-dependency.emitter";
import { CacheDependencyGraph } from "./cache-dependency.interface";
import { CacheDependencyService } from "./cache-dependency.service";
import { CACHE_DEPENDENCY_MODULE_OPTIONS } from "./constants";
import { wait } from "./test.utils";

describe.each(["memory", "redis"])("store: %s", (storeName: string) => {
  describe.each(["", "v1", "next", "dev"])("CacheDependencyService version: %s", (version: string) => {
    let service: CacheDependencyService;
    beforeEach(async () => {
      const app = await Test.createTestingModule({
        providers: [
          CacheDependencyService,
          CacheDependencyEventEmitter,
          {
            provide: CACHE_MANAGER,
            useValue:
              storeName === "memory"
                ? caching({
                    store: "memory",
                    max: Number.MAX_SAFE_INTEGER,
                    ttl: 1000,
                  })
                : caching({
                    store: redisStore,
                    host: process.env.REDIS_HOST || "localhost",
                    ttl: 5,
                  } as any),
          },
          {
            provide: CACHE_DEPENDENCY_MODULE_OPTIONS,
            useValue: { version },
          },
        ],
      }).compile();

      expect(app).toBeDefined();
      service = app.get<CacheDependencyService>(CacheDependencyService);
    });

    afterEach(async () => {
      if (storeName === "redis") {
        await service?.["cacheManager"]?.["store"]?.["redisCache"]?.flushdb();
        await service?.["cacheManager"]?.["store"]?.close();
      }
    });

    it("should be defined", () => {
      expect(service).toBeDefined();
    });
    describe("get/set/delete", () => {
      it("should be defined", () => {
        expect(service.getCache).toBeDefined();
        expect(service.setCache).toBeDefined();
        expect(service.deleteCache).toBeDefined();
        expect(service.get).toBeDefined();
        expect(service.set).toBeDefined();
        expect(service.delete).toBeDefined();
      });

      it("should call deprecated functions", async () => {
        await expect(service.getCache("test")).resolves.toBeUndefined();
        await expect(service.setCache("test", "value")).resolves.toBeUndefined();
        await expect(service.deleteCache("test")).resolves.toBeUndefined();
      });

      it("test", async () => {
        await service.delete();
        await expect(service.get("test")).resolves.toBeUndefined();
        await service.set("test", 0);
        await expect(service.get("test")).resolves.toBe(0);
        await service.set("test", "");
        await expect(service.get("test")).resolves.toBe("");
        await service.set("test", 1);
        await expect(service.get("test")).resolves.toBe(1);
        await service.delete("test");
        await expect(service.get("test")).resolves.toBeUndefined();
      });

      it("set ttl", async () => {
        await expect(service.get("test")).resolves.toBeUndefined();
        await service.set("test", 1, 1);
        await expect(service.get("test")).resolves.toBe(1);
        await wait(2000);
        await expect(service.get("test")).resolves.toBeUndefined();
      });

      it("set date object", async () => {
        const date = new Date();
        await expect(service.get("test")).resolves.toBeUndefined();
        await service.set("test", { date });
        await expect(service.get("test")).resolves.toEqual({ date });
      });

      it("shouldn't set undefined value", async () => {
        await expect(service.get("test")).resolves.toBeUndefined();
        await service.set("test", undefined);
        await expect(service.get("test")).resolves.toBeUndefined();
      });

      it("shouldn't set non string key", async () => {
        await expect(service.get("test")).resolves.toBeUndefined();
        await service.set({ obj: "key" } as any, "value");
        await expect(service.get({ obj: "key" } as any)).resolves.toBeUndefined();
      });
    });

    describe("mget", () => {
      it("should get caches", async () => {
        await expect(service.mget([])).resolves.toEqual({});

        await expect(service.mget(["key1", "key2"])).resolves.toEqual({
          key1: undefined,
          key2: undefined,
        });

        await service.set("key1", "value1");

        await expect(service.mget(["key1", "key2"])).resolves.toEqual({
          key1: "value1",
          key2: undefined,
        });
      });
    });

    describe("mset", () => {
      it("should get caches", async () => {
        await service.mset({});

        await expect(service.mget(["key1", "key2"])).resolves.toEqual({
          key1: undefined,
          key2: undefined,
        });

        await service.mset({ key1: "value1" });

        await expect(service.mget(["key1", "key2"])).resolves.toEqual({
          key1: "value1",
          key2: undefined,
        });
      });
    });

    describe("dependency", () => {
      it("should clear A and A-A", async () => {
        const graph = service.createGraph();

        graph.addNode("A", 1);
        graph.addNode("A-A", 1);
        graph.addNode("A-B", 1);
        graph.addDependency("A", "A-A");
        graph.addDependency("A", "A-B");

        await service.createCacheDependencies(graph);

        await expect(service.getEntries()).resolves.toEqual([
          { key: "A", value: 1 },
          { key: "A-A", value: 1 },
          { key: "A-B", value: 1 },
          { key: "cache-dependency:A", value: ["A-A", "A-B"] },
        ]);

        await service.clearCacheDependencies("A");

        await expect(service.getEntries()).resolves.toEqual([]);
      });

      it("should clear A and A-A and A-A-A", async () => {
        await service.createCacheDependencies((graph: CacheDependencyGraph) => {
          graph.addNode("A", 1);
          graph.addNode("A-A");
          graph.addNode("A-B");
          graph.addNode("A-A-A");
          graph.addDependency("A", "A-A");
          graph.addDependency("A-A", "A-A-A");
          graph.addDependency("A", "A-B");
        });

        await expect(service.getEntries()).resolves.toEqual([
          { key: "A", value: 1 },
          { key: "cache-dependency:A", value: ["A-A", "A-A-A", "A-B"] },
          { key: "cache-dependency:A-A", value: ["A-A-A"] },
        ]);

        await service.clearCacheDependencies("A-A-A");

        await expect(service.getEntries()).resolves.toEqual([
          { key: "A", value: 1 },
          { key: "cache-dependency:A", value: ["A-A", "A-A-A", "A-B"] },
          { key: "cache-dependency:A-A", value: ["A-A-A"] },
        ]);
      });

      it("should clear AB", async () => {
        await service.createCacheDependencies((graph: CacheDependencyGraph) => {
          graph.addNode("A", 1);
          graph.addNode("B", 2);
          graph.addNode("AB", [1, 2]);
          graph.addDependency("A", "AB");
          graph.addDependency("B", "AB");
        });

        await expect(service.getEntries()).resolves.toEqual([
          { key: "A", value: 1 },
          { key: "AB", value: [1, 2] },
          { key: "B", value: 2 },
          { key: "cache-dependency:A", value: ["AB"] },
          { key: "cache-dependency:B", value: ["AB"] },
        ]);

        await service.clearCacheDependencies("AB");

        await expect(service.getEntries()).resolves.toEqual([
          { key: "A", value: 1 },
          { key: "B", value: 2 },
          { key: "cache-dependency:A", value: ["AB"] },
          { key: "cache-dependency:B", value: ["AB"] },
        ]);
      });

      it("should clear all", async () => {
        await service.createCacheDependencies((graph: CacheDependencyGraph) => {
          graph.addNode("A", 1);
          graph.addNode("A-A", 1);
          graph.addNode("A-B", 1);
          graph.addNode("A-B-A", 1);
          graph.addNode("A-A-A", 1);
          graph.addDependency("A", "A-A");
          graph.addDependency("A-A", "A-A-A");
          graph.addDependency("A", "A-B");
          graph.addDependency("A-B", "A-B-A");
          graph.addDependency("A-A-A", "A-B-A");
        });

        await expect(service.getEntries()).resolves.toEqual([
          { key: "A", value: 1 },
          { key: "A-A", value: 1 },
          { key: "A-A-A", value: 1 },
          { key: "A-B", value: 1 },
          { key: "A-B-A", value: 1 },
          { key: "cache-dependency:A", value: ["A-A", "A-A-A", "A-B", "A-B-A"] },
          { key: "cache-dependency:A-A", value: ["A-A-A", "A-B-A"] },
          { key: "cache-dependency:A-A-A", value: ["A-B-A"] },
          { key: "cache-dependency:A-B", value: ["A-B-A"] },
        ]);

        await expect(service.getCacheDependencyKeys("A-A")).resolves.toEqual([
          "A-A",
          "A-A-A",
          "A-B-A",
          "cache-dependency:A-A",
          "cache-dependency:A-A-A",
          "cache-dependency:A-B-A",
        ]);

        await service.clearCacheDependencies("A-A");

        await expect(service.getEntries()).resolves.toEqual([
          { key: "A", value: 1 },
          { key: "A-B", value: 1 },
          { key: "cache-dependency:A", value: ["A-A", "A-A-A", "A-B", "A-B-A"] },
          { key: "cache-dependency:A-B", value: ["A-B-A"] },
        ]);
      });
    });

    describe("getKeys", () => {
      it("should get keys", async () => {
        await service.mset({
          "A-A": 1,
          "A-B": 1,
          "A-B-C": 1,
          "A-B-D": 1,
          "A-C-D": 1,
        });

        await expect(service.getKeys("A-*")).resolves.toEqual(["A-A", "A-B", "A-B-C", "A-B-D", "A-C-D"]);
        await expect(service.getKeys("A-B-*")).resolves.toEqual(["A-B-C", "A-B-D"]);
        await expect(service.getKeys("A-*-D")).resolves.toEqual(["A-B-D", "A-C-D"]);
        await expect(service.getKeys("*-B-*")).resolves.toEqual(["A-B-C", "A-B-D"]);
      });
    });

    describe("getEntries", () => {
      it("should get entries", async () => {
        const graph = service.createGraph();

        graph.addNode("A", 1);
        graph.addNode("A-A", 1);
        graph.addNode("A-B", 1);
        graph.addDependency("A", "A-A");
        graph.addDependency("A", "A-B");
        await service.createCacheDependencies(graph);

        await expect(service.getEntries()).resolves.toEqual([
          { key: "A", value: 1 },
          { key: "A-A", value: 1 },
          { key: "A-B", value: 1 },
          { key: "cache-dependency:A", value: ["A-A", "A-B"] },
        ]);

        await expect(service.getEntries("A-*")).resolves.toEqual([
          { key: "A-A", value: 1 },
          { key: "A-B", value: 1 },
        ]);
      });
    });
  });
});
