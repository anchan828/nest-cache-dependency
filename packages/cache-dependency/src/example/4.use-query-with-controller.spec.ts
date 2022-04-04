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
  Query,
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
    .map((_, index) => ({ id: index + 1, name: `Item ${index + 1}` }));

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
  @CacheKey("users/:userId/items?name=:name")
  @CacheDependency<Item[]>(
    (cacheKey: string, items: Item[], graph: CacheDependencyGraph, rawParams: { userId: string }) => {
      const key = `users/${rawParams.userId}/items`;

      for (const item of items) {
        // e.g. users/1/items/2
        graph.addNode(`${key}/${item.id}`, item);

        // When an item is updated, it should be deleted both when filtered by name and when not.
        graph.addNode(key);
        graph.addDependency(`${key}/${item.id}`, key);
        graph.addDependency(`${key}/${item.id}`, cacheKey);
      }
    },
  )
  public getItemsByName(@Query("name") name: string): Item[] {
    return this.service.getItems().filter((item) => item.name === name);
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

describe("4. Use query with Controller", () => {
  it("test", async () => {
    const module = await Test.createTestingModule({
      imports: [ExampleModule],
    }).compile();

    const app = await module.createNestApplication().init();
    const service = app.get<CacheDependencyService>(CacheDependencyService);

    await request(app.getHttpServer()).get(`/users/1000/items/1`).expect(200).expect({ id: 1, name: "Item 1" });

    await expect(service.getKeys()).resolves.toEqual(["users/1000/items/1"]);

    await request(app.getHttpServer())
      .get(`/users/1000/items`)
      .query({ name: "Item 1" })
      .expect(200)
      .expect([{ id: 1, name: "Item 1" }]);

    await expect(service.getKeys()).resolves.toEqual([
      "cache-dependency:users/1000/items/1",
      "users/1000/items/1",
      "users/1000/items?name=Item%201",
    ]);

    await request(app.getHttpServer()).delete(`/users/1000/items/1`).expect(200).expect({});

    await expect(service.getKeys()).resolves.toEqual([]);

    await app.close();
  });
});
