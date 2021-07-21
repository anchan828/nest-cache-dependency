import { Injectable, Module } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { CacheDependencyGraph } from "../cache-dependency.interface";
import { CacheDependencyModule } from "../cache-dependency.module";
import { CacheDependencyService } from "../cache-dependency.service";
import { CACHE_DEPENDENCY_PREFIX_CACHE_KEY } from "../constants";
interface Item {
  id: number;
  name: string;
  nestItems?: Item[];
}

@Injectable()
export class ExampleService {
  constructor(private readonly cacheService: CacheDependencyService) {}

  private items: Item[] = Array(5)
    .fill(0)
    .map((_, index) => ({
      id: index,
      name: `Item ${index}`,
      nestItems: Array(2)
        .fill(0)
        .map((_, nestIndex) => ({ id: nestIndex, name: `Nest Item ${nestIndex}` })),
    }));

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
        graph.addDependency(`item/${item.id}`, cacheKey);

        if (Array.isArray(item.nestItems)) {
          for (const nestItem of item.nestItems) {
            graph.addNode(`item/${item.id}/nestItem/${nestItem.id}`, nestItem);
            graph.addDependency(`item/${item.id}`, `item/${item.id}/nestItem/${nestItem.id}`);
          }
        }
      }
    });

    return this.items;
  }

  public async deleteNestItem(userId: number, itemId: number): Promise<void> {
    await this.cacheService.clearCacheDependencies(`item/${itemId}`);
  }
}

@Module({
  imports: [CacheDependencyModule.register()],
  providers: [ExampleService],
})
export class UseWithServiceModule {}

describe("3. Nest dependency", () => {
  it("test", async () => {
    const app = await Test.createTestingModule({
      imports: [UseWithServiceModule],
    }).compile();

    const service = app.get<ExampleService>(ExampleService);
    const cacheService = app.get<CacheDependencyService>(CacheDependencyService);
    const userId = Date.now();

    await expect(service.getItems(userId)).resolves.toStrictEqual([
      {
        id: 0,
        name: "Item 0",
        nestItems: [
          {
            id: 0,
            name: "Nest Item 0",
          },
          {
            id: 1,
            name: "Nest Item 1",
          },
        ],
      },
      {
        id: 1,
        name: "Item 1",
        nestItems: [
          {
            id: 0,
            name: "Nest Item 0",
          },
          {
            id: 1,
            name: "Nest Item 1",
          },
        ],
      },
      {
        id: 2,
        name: "Item 2",
        nestItems: [
          {
            id: 0,
            name: "Nest Item 0",
          },
          {
            id: 1,
            name: "Nest Item 1",
          },
        ],
      },
      {
        id: 3,
        name: "Item 3",
        nestItems: [
          {
            id: 0,
            name: "Nest Item 0",
          },
          {
            id: 1,
            name: "Nest Item 1",
          },
        ],
      },
      {
        id: 4,
        name: "Item 4",
        nestItems: [
          {
            id: 0,
            name: "Nest Item 0",
          },
          {
            id: 1,
            name: "Nest Item 1",
          },
        ],
      },
    ]);

    await expect(cacheService.getKeys()).resolves.toEqual([
      `${CACHE_DEPENDENCY_PREFIX_CACHE_KEY}item/0`,
      `${CACHE_DEPENDENCY_PREFIX_CACHE_KEY}item/1`,
      `${CACHE_DEPENDENCY_PREFIX_CACHE_KEY}item/2`,
      `${CACHE_DEPENDENCY_PREFIX_CACHE_KEY}item/3`,
      `${CACHE_DEPENDENCY_PREFIX_CACHE_KEY}item/4`,
      `item/0`,
      `item/0/nestItem/0`,
      `item/0/nestItem/1`,
      `item/1`,
      `item/1/nestItem/0`,
      `item/1/nestItem/1`,
      `item/2`,
      `item/2/nestItem/0`,
      `item/2/nestItem/1`,
      `item/3`,
      `item/3/nestItem/0`,
      `item/3/nestItem/1`,
      `item/4`,
      `item/4/nestItem/0`,
      `item/4/nestItem/1`,
      `users/${userId}/items`,
    ]);

    await service.deleteNestItem(userId, 2);

    await expect(cacheService.getKeys()).resolves.toEqual([
      `${CACHE_DEPENDENCY_PREFIX_CACHE_KEY}item/0`,
      `${CACHE_DEPENDENCY_PREFIX_CACHE_KEY}item/1`,
      `${CACHE_DEPENDENCY_PREFIX_CACHE_KEY}item/3`,
      `${CACHE_DEPENDENCY_PREFIX_CACHE_KEY}item/4`,
      `item/0`,
      `item/0/nestItem/0`,
      `item/0/nestItem/1`,
      `item/1`,
      `item/1/nestItem/0`,
      `item/1/nestItem/1`,
      `item/3`,
      `item/3/nestItem/0`,
      `item/3/nestItem/1`,
      `item/4`,
      `item/4/nestItem/0`,
      `item/4/nestItem/1`,
    ]);
  });
});
