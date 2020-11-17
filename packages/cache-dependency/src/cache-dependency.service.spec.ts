import { CACHE_MANAGER } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { caching } from "cache-manager";
import { CacheDependencyGraph } from "./cache-dependency.interface";
import { CacheDependencyService } from "./cache-dependency.service";
import { wait } from "./test.utils";
describe("CacheDependencyService", () => {
  let service: CacheDependencyService;
  beforeEach(async () => {
    const app = await Test.createTestingModule({
      providers: [
        CacheDependencyService,
        {
          provide: CACHE_MANAGER,
          useValue: caching({
            store: "memory",
            max: Number.MAX_SAFE_INTEGER,
            ttl: 1000,
          }),
        },
      ],
    }).compile();

    expect(app).toBeDefined();
    service = app.get<CacheDependencyService>(CacheDependencyService);
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
      await expect(service.get("test")).resolves.toBeUndefined();
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
    });
  });

  describe("mget", () => {
    it("should get caches", async () => {
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
      await service.createCacheDependencies((graph: CacheDependencyGraph) => {
        graph.addNode("A", 1);
        graph.addNode("A-A", 1);
        graph.addNode("A-B", 1);
        graph.addDependency("A", "A-A");
        graph.addDependency("A", "A-B");
      });

      await expect(service.getKeys()).resolves.toEqual(["cache-dependency:A", "A", "A-B", "A-A"]);

      await service.clearCacheDependencies("A");

      await expect(service.getKeys()).resolves.toEqual([]);
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

      await expect(service.getKeys()).resolves.toEqual(["cache-dependency:A", "A", "cache-dependency:A-A"]);

      await service.clearCacheDependencies("A-A-A");

      await expect(service.getKeys()).resolves.toEqual(["cache-dependency:A", "A", "cache-dependency:A-A"]);
    });

    it("should clear AB", async () => {
      await service.createCacheDependencies((graph: CacheDependencyGraph) => {
        graph.addNode("A", 1);
        graph.addNode("B", 2);
        graph.addNode("AB", [1, 2]);
        graph.addDependency("A", "AB");
        graph.addDependency("B", "AB");
      });

      await expect(service.getKeys()).resolves.toEqual(["cache-dependency:B", "B", "cache-dependency:A", "A", "AB"]);

      await service.clearCacheDependencies("AB");

      await expect(service.getKeys()).resolves.toEqual(["cache-dependency:B", "B", "cache-dependency:A", "A"]);
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

      await expect(service.getKeys()).resolves.toEqual([
        "cache-dependency:A",
        "A",
        "cache-dependency:A-B",
        "A-B",
        "cache-dependency:A-A",
        "A-A",
        "cache-dependency:A-A-A",
        "A-A-A",
        "A-B-A",
      ]);

      await expect(service.getCacheDependencyKeys("A-A")).resolves.toEqual([
        "A-B-A",
        "cache-dependency:A-B-A",
        "A-A-A",
        "cache-dependency:A-A-A",
        "A-B-A",
        "cache-dependency:A-B-A",
        "A-A",
        "cache-dependency:A-A",
      ]);

      await service.clearCacheDependencies("A-A");

      await expect(service.getKeys()).resolves.toEqual(["cache-dependency:A", "A", "cache-dependency:A-B", "A-B"]);
    });
  });
});
