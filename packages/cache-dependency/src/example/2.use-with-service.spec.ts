import { Injectable, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { CacheDependencyGraph } from "../cache-dependency.interface";
import { CacheDependencyModule } from "../cache-dependency.module";
import { CacheDependencyService } from "../cache-dependency.service";

interface Parent {
  id: number;
  name: string;
  children: Child[];
}

interface Child {
  id: number;
  name: string;
  grandchildren: GrandChild[];
}

interface GrandChild {
  id: number;
  name: string;
}

@Injectable()
export class UseWithServiceService {
  constructor(private readonly cacheService: CacheDependencyService) {}

  public async getParentWithCache(parentID: number): Promise<Parent> {
    return this.cacheService.getCache<Parent>(`parent/${parentID}`);
  }

  public async getParent(parentID: number): Promise<Parent> {
    const cacheKey = `parent/${parentID}`;
    const cache = await this.cacheService.getCache<Parent>(cacheKey);
    if (cache) {
      return cache;
    }

    const parent = {
      id: parentID,
      name: "parent",
      children: [
        {
          id: parentID + 1,
          name: "child 1",
          grandchildren: [
            {
              id: parentID + 100,
              name: "grandchild 1",
            },
          ],
        },
        {
          id: parentID + 2,
          name: "child 2",
          grandchildren: [
            {
              id: parentID + 200,
              name: "grandchild 2",
            },
          ],
        },
        {
          id: parentID + 3,
          name: "child 3",
          grandchildren: [
            {
              id: parentID + 300,
              name: "grandchild 3",
            },
          ],
        },
      ],
    };

    await this.cacheService.createCacheDependencies((graph: CacheDependencyGraph) => {
      graph.addNode(cacheKey, parent);
      for (const child of parent.children) {
        graph.addNode(`child/${child.id}`, child);
        graph.addDependency(`child/${child.id}`, `parent/${parent.id}`);
        for (const grandchild of child.grandchildren) {
          graph.addNode(`grandchild/${grandchild.id}`, grandchild);
          graph.addDependency(`grandchild/${grandchild.id}`, `child/${child.id}`);
        }
      }
    });
    return parent;
  }

  public async deleteChild(childID: number): Promise<void> {
    await this.cacheService.clearCacheDependencies(`child/${childID}`);
  }

  public async deleteGrandChild(grandchildID: number): Promise<void> {
    await this.cacheService.clearCacheDependencies(`grandchild/${grandchildID}`);
  }
}

@Module({
  imports: [
    CacheDependencyModule.register({
      ttl: 30,
    }),
  ],
  providers: [UseWithServiceService],
})
export class UseWithServiceModule {}

describe("2. Use with Service", () => {
  it("test", async () => {
    const app = await Test.createTestingModule({
      imports: [UseWithServiceModule],
    }).compile();

    const service = app.get<UseWithServiceService>(UseWithServiceService);
    const parentID = Date.now();
    const result = {
      id: parentID,
      name: "parent",
      children: [
        { id: parentID + 1, name: "child 1", grandchildren: [{ id: parentID + 100, name: "grandchild 1" }] },
        { id: parentID + 2, name: "child 2", grandchildren: [{ id: parentID + 200, name: "grandchild 2" }] },
        { id: parentID + 3, name: "child 3", grandchildren: [{ id: parentID + 300, name: "grandchild 3" }] },
      ],
    };
    await expect(service.getParentWithCache(parentID)).resolves.toBeUndefined();
    await expect(service.getParent(parentID)).resolves.toEqual(result);
    await expect(service.getParentWithCache(parentID)).resolves.toEqual(result);
    await service.deleteChild(parentID + 3);
    await expect(service.getParentWithCache(parentID)).resolves.toBeUndefined();

    await expect(service.getParent(parentID)).resolves.toEqual(result);
    await service.deleteGrandChild(parentID + 200);
    await expect(service.getParentWithCache(parentID)).resolves.toBeUndefined();
  });
});
