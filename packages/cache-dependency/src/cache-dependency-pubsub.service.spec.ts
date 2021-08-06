import { Test, TestingModule } from "@nestjs/testing";
import { CacheDependencyModule } from "./cache-dependency.module";
import { CacheDependencyService } from "./cache-dependency.service";
import { wait } from "./test.utils";

describe("CacheDependencyPubSubService", () => {
  let apps: TestingModule[] = [];
  beforeEach(async () => {
    apps = [];
    for (let i = 0; i < 10; i++) {
      const module = await Test.createTestingModule({
        imports: [CacheDependencyModule.register({ pubsub: { host: "localhost" } })],
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
