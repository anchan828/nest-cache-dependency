import { Injectable, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { CacheDependencyGraph } from "../cache-dependency.interface";
import { CacheDependencyModule } from "../cache-dependency.module";
import { CacheDependencyService } from "../cache-dependency.service";
import { CACHE_DEPENDENCY_PREFIX_CACHE_KEY } from "../constants";
import { wait } from "../test.utils";
interface Item {
  id: number;
  name: string;
}

@Injectable()
export class ExampleService {
  constructor(private readonly cacheService: CacheDependencyService) {}

  private items: Item[] = Array(5)
    .fill(0)
    .map((_, index) => ({ id: index, name: `Item ${index}` }));

  public async getItems(userId: number): Promise<Item[]> {
    const cacheKey = `users/${userId}/items`;

    const cache = await this.cacheService.getCache<Item[]>(cacheKey);

    if (cache) {
      return cache;
    }

    await this.cacheService.createCacheDependencies((graph: CacheDependencyGraph) => {
      graph.addNode(cacheKey, this.items);

      for (const item of this.items) {
        graph.addNode(`item/${item.id}`, item);
        graph.addDependency(cacheKey, `item/${item.id}`);
      }
    });

    return this.items;
  }

  public deleteItem(userId: number, itemId: number): void {
    this.items = this.items.filter((item) => item.id !== itemId);
    this.cacheService.clearCacheDependencies(`users/${userId}/items`);
  }
}

@Module({
  imports: [CacheDependencyModule.register()],
  providers: [ExampleService],
})
export class UseWithServiceModule {}

describe("2. Use with Service", () => {
  it("test", async () => {
    const app = await Test.createTestingModule({
      imports: [UseWithServiceModule],
    }).compile();

    const service = app.get<ExampleService>(ExampleService);
    const cacheService = app.get<CacheDependencyService>(CacheDependencyService);
    const userId = Date.now();

    await expect(service.getItems(userId)).resolves.toStrictEqual([
      { id: 0, name: "Item 0" },
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" },
      { id: 3, name: "Item 3" },
      { id: 4, name: "Item 4" },
    ]);

    await wait(1);
    await expect(cacheService.getKeys()).resolves.toEqual([
      `${CACHE_DEPENDENCY_PREFIX_CACHE_KEY}users/${userId}/items`,
      `users/${userId}/items`,
      `item/4`,
      `item/3`,
      `item/2`,
      `item/1`,
      `item/0`,
    ]);

    await service.deleteItem(userId, 2);

    await wait(500);

    await expect(cacheService.getKeys()).resolves.toEqual([]);
  });
});
