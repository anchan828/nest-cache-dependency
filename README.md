# @anchan828/nest-cache-dependency

![npm](https://img.shields.io/npm/v/@anchan828/nest-cache-dependency.svg)
![NPM](https://img.shields.io/npm/l/@anchan828/nest-cache-dependency.svg)

A cache dependency module for Nest framework (node.js) https://nestjs.com/

## Description

nest-cache-dependency consider dependencies. Delete those that depend on the deletion.

**TODO**: Write more documentation.

## Installation

```bash
$ npm i --save @anchan828/nest-cache-dependency
```

## Quick Start

- Import module

```ts
@Module({
  imports: [CacheDependencyModule.register()],
})
export class AppModule {}
```

### Use with controller

```ts
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
  public deleteItem(@Param("userId", ParseIntPipe) userId: number, @Param("itemId", ParseIntPipe) itemId: number): void {
    this.service.deleteItem(userId, itemId);
  }
}
```

### Use with service

```ts
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
    
    const item = this.items.find(item => item.id === itemId);
    await this.cacheService.setCache(cacheKey, item);
    
    return item;
  }
  
  public async deleteItem(userId: number, itemId: number): Promise<void> {
    this.items = this.items.filter(item => item.id !== itemId);
    await this.cacheService.clearCacheDependencies(`users/${userId}/items/${itemId}`);
  }
}
```

## Notes

`@CacheKey` supports [route-parser](https://www.npmjs.com/package/route-parser). You can use `:name` pattern as cache key

`CacheDependencyGraph` uses [dependency-graph](https://www.npmjs.com/package/dependency-graph)

## License

[MIT](LICENSE)
