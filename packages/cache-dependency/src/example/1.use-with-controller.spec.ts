import {
  CacheKey,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
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

  public getItem(userId: number, itemId: number): Item {
    const item = this.items.find((item) => item.id === itemId);

    if (!item) {
      throw new NotFoundException();
    }

    return item;
  }

  public deleteItem(userId: number, itemId: number): void {
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
    for (const item of items) {
      // e.g. users/1/items/2
      graph.addNode(`${cacheKey}/${item.id}`, item);
      graph.addDependency(`${cacheKey}/${item.id}`, cacheKey);
    }
  })
  public getItems(): Item[] {
    return this.service.getItems();
  }

  @Get("users/:userId/items/:itemId")
  @CacheKey("users/:userId/items/:itemId")
  public getItem(@Param("userId", ParseIntPipe) userId: number, @Param("itemId", ParseIntPipe) itemId: number): Item {
    return this.service.getItem(userId, itemId);
  }

  @Delete("users/:userId/items/:itemId")
  @ClearCacheDependencies("users/:userId/items/:itemId")
  public deleteItem(
    @Param("userId", ParseIntPipe) userId: number,
    @Param("itemId", ParseIntPipe) itemId: number,
  ): void {
    this.service.deleteItem(userId, itemId);
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

    await request(app.getHttpServer()).get(`/users/1000/items/0`).expect(200).expect({ id: 0, name: "Item 0" });

    await expect(service.getKeys()).resolves.toEqual(["users/1000/items/0"]);

    // cache
    await request(app.getHttpServer()).get(`/users/1000/items/0`).expect(200).expect({ id: 0, name: "Item 0" });

    await request(app.getHttpServer())
      .get(`/users/1000/items`)
      .expect(200)
      .expect([
        { id: 0, name: "Item 0" },
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
        { id: 3, name: "Item 3" },
        { id: 4, name: "Item 4" },
      ]);

    await expect(service.getKeys()).resolves.toEqual([
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
      `users/1000/items`,
    ]);

    await request(app.getHttpServer()).delete(`/users/1000/items/2`).expect(200).expect({});

    await expect(service.getKeys()).resolves.toEqual([
      "cache-dependency:users/1000/items/4",
      "users/1000/items/4",
      "cache-dependency:users/1000/items/3",
      "users/1000/items/3",
      "cache-dependency:users/1000/items/1",
      "users/1000/items/1",
      "cache-dependency:users/1000/items/0",
      "users/1000/items/0",
    ]);

    await app.close();
  });
});
