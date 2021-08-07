import { redisStore } from "@anchan828/nest-cache-manager-ioredis";
import { Test, TestingModule } from "@nestjs/testing";
import { CacheDependencyModule } from "./cache-dependency.module";
import { CacheDependencyService } from "./cache-dependency.service";
import { wait } from "./test.utils";
describe("CacheDependencyPubSubService", () => {
  let apps: TestingModule[] = [];
  beforeEach(async () => {
    apps = [];
    for (let i = 0; i < 1; i++) {
      const module = await Test.createTestingModule({
        imports: [
          CacheDependencyModule.register([
            { ttl: 10, pubsub: { host: "localhost" } },
            { store: redisStore, host: process.env.REDIS_HOST || "localhost" },
          ]),
        ],
      }).compile();

      const app = await module.init();
      apps.push(app);
    }
  });

  afterEach(async () => {
    await wait(500);
    await Promise.all(apps.map((app) => app.close()));
  });

  it("should", async () => {
    const service = apps[0].get(CacheDependencyService);

    const graph = service.createGraph();
    graph.addNode("A", "A");
    graph.addNode("B", "B");
    graph.addDependency("A", "B");

    await service.createCacheDependencies(graph);

    await service.clearCacheDependencies("A");
  });
});
