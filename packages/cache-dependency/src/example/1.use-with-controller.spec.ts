import {
  CacheKey,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  ParseIntPipe,
  UseInterceptors,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { CacheDependency, CacheDependencyGraph } from "..";
import { ClearCacheDependencies } from "../cache-dependency.decorator";
import { CacheDependencyInterceptor } from "../cache-dependency.interceptor";
import { CacheDependencyModule } from "../cache-dependency.module";
import { CacheDependencyService } from "../cache-dependency.service";
import { wait } from "../test.utils";
interface Item {
  id: number;
  name: string;
}

@Injectable()
export class ExampleService {
  private items: Item[] = Array(5)
    .fill(0)
    .map((_, index) => ({ id: index, name: `Item ${index}` }));

  public getItems(): Item[] {
    return this.items;
  }

  public deleteItem(itemId: number): void {
    this.items = this.items.filter((item) => item.id !== itemId);
  }
}

@Controller()
@UseInterceptors(CacheDependencyInterceptor)
export class ExampleController {
  constructor(private readonly service: ExampleService) {}

  @Get("users/:userId/items")
  @CacheKey("users/:userId/items")
  @CacheDependency<Item[]>((cacheKey: string, items: Item[], graph: CacheDependencyGraph) => {
    graph.addNode(cacheKey);
    for (const item of items) {
      graph.addNode(`item/${item.id}`, item);
      graph.addDependency(cacheKey, `item/${item.id}`);
    }
  })
  public getItems(): Item[] {
    return this.service.getItems();
  }

  @Delete("users/:userId/items/:itemId")
  @ClearCacheDependencies("users/:userId/items")
  public deleteItem(@Param("itemId", ParseIntPipe) itemId: number): void {
    this.service.deleteItem(itemId);
  }
}

@Module({
  imports: [
    CacheDependencyModule.register({
      max: 10000,
    }),
  ],
  providers: [ExampleService],
  controllers: [ExampleController],
})
export class ExampleModule {}

describe("1. Use with Controller", () => {
  it("test", async () => {
    const module = await Test.createTestingModule({
      imports: [ExampleModule],
    }).compile();

    const app = await module.createNestApplication().init();
    const service = app.get<CacheDependencyService>(CacheDependencyService);
    const userId = Date.now();
    await request(app.getHttpServer())
      .get(`/users/${userId}/items`)
      .expect(200)
      .expect([
        { id: 0, name: "Item 0" },
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
        { id: 3, name: "Item 3" },
        { id: 4, name: "Item 4" },
      ]);

    await wait(1);

    await expect(service.getKeys()).resolves.toEqual([
      `cache-dependency:users/${userId}/items`,
      `users/${userId}/items`,
      `item/4`,
      `item/3`,
      `item/2`,
      `item/1`,
      `item/0`,
    ]);

    await request(app.getHttpServer()).delete(`/users/${userId}/items/2`).expect(200).expect({});

    await wait(500);

    await expect(service.getKeys()).resolves.toEqual([]);

    await app.close();
  });
});
