import { Injectable, Module, NotFoundException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { CacheDependencyGraph } from "../cache-dependency.interface";
import { CacheDependencyModule } from "../cache-dependency.module";
import { CacheDependencyService } from "../cache-dependency.service";
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
        graph.addNode(`${cacheKey}/${item.id}`, item);
        graph.addDependency(`${cacheKey}/${item.id}`, cacheKey);
      }
    });

    return this.items;
  }

  public async getItem(userId: number, itemId: number): Promise<Item> {
    const cacheKey = `users/${userId}/items/${itemId}`;

    const cache = await this.cacheService.getCache<Item>(cacheKey);

    if (cache) {
      return cache;
    }

    const item = this.items.find((item) => item.id === itemId);

    if (!item) {
      throw new NotFoundException();
    }

    await this.cacheService.setCache(cacheKey, item);

    return item;
  }

  public async deleteItem(userId: number, itemId: number): Promise<void> {
    this.items = this.items.filter((item) => item.id !== itemId);
    await this.cacheService.clearCacheDependencies(`users/${userId}/items/${itemId}`);
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

    await expect(service.getItem(1000, 0)).resolves.toStrictEqual({ id: 0, name: "Item 0" });

    await expect(cacheService.getKeys()).resolves.toEqual([`users/1000/items/0`]);

    await expect(service.getItems(1000)).resolves.toStrictEqual([
      { id: 0, name: "Item 0" },
      { id: 1, name: "Item 1" },
      { id: 2, name: "Item 2" },
      { id: 3, name: "Item 3" },
      { id: 4, name: "Item 4" },
    ]);

    await expect(cacheService.getKeys()).resolves.toEqual([
      "cache-dependency:users/1000/items/4",
      "users/1000/items/4",
      "cache-dependency:users/1000/items/3",
      "users/1000/items/3",
      "cache-dependency:users/1000/items/2",
      "users/1000/items/2",
      "cache-dependency:users/1000/items/1",
      "users/1000/items/1",
      "cache-dependency:users/1000/items/0",
      "users/1000/items/0",
      "users/1000/items",
    ]);

    await service.deleteItem(1000, 2);

    await expect(cacheService.getKeys()).resolves.toEqual([
      "cache-dependency:users/1000/items/4",
      "users/1000/items/4",
      "cache-dependency:users/1000/items/3",
      "users/1000/items/3",
      "cache-dependency:users/1000/items/1",
      "users/1000/items/1",
      "cache-dependency:users/1000/items/0",
      "users/1000/items/0",
    ]);
  });
});
