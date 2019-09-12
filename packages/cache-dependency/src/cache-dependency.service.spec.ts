import { CACHE_MANAGER } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { caching } from "cache-manager";
import { CacheDependencyGraph } from "./cache-dependency.interface";
import { CacheDependencyService } from "./cache-dependency.service";

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
  describe("getCache/setCache/deleteCache", () => {
    it("should be defined", () => {
      expect(service.getCache).toBeDefined();
      expect(service.setCache).toBeDefined();
      expect(service.deleteCache).toBeDefined();
    });

    it("test", async () => {
      await expect(service.getCache("test")).resolves.toBeUndefined();
      await service.setCache("test", 1);
      await expect(service.getCache("test")).resolves.toBe(1);
      await service.deleteCache("test");
      await expect(service.getCache("test")).resolves.toBeUndefined();
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

      await service.clearCacheDependencies("A-A");

      await expect(service.getKeys()).resolves.toEqual(["cache-dependency:A", "A", "cache-dependency:A-B", "A-B"]);
    });
  });
});
