# @anchan828/nest-cache-dependency

![npm](https://img.shields.io/npm/v/@anchan828/nest-cache-dependency.svg)
![NPM](https://img.shields.io/npm/l/@anchan828/nest-cache-dependency.svg)

## Description

nest-cache-dependency consider dependencies. Delete those that depend on the deletion.

**TODO**: Write more documentation.

## Installation

```bash
$ npm i --save nest-cache-dependency
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
  @Get("parents/:parentID")
  @CacheKey("parent/:parentID")
  @CacheDependency<Parent>((response: Parent, graph: CacheDependencyGraph) => {
    for (const child of response.children) {
      graph.addNode(`child/${child.id}`, child);
      graph.addDependency(`child/${child.id}`, `parent/${response.id}`);
    }
  })
  public async test(@Param("parentID", ParseIntPipe) parentID: number): Promise<Parent> {
    return this.service.getParent(parentID);
  }

  @Delete("children/:childID")
  public async deleteChild(@Param("childID", ParseIntPipe) childID: number): Promise<void> {
    await this.cacheService.clearCacheDependencies(`child/${childID}`);
  }
}
```

### Use with service

```ts
@Injectable()
export class ExampleService {
  constructor(private readonly cacheService: CacheDependencyService) {}

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
        { id: parentID + 1, name: "child 1" },
        { id: parentID + 2, name: "child 2" },
        { id: parentID + 3, name: "child 3" },
      ],
    };

    await this.cacheService.createCacheDependencies((graph: CacheDependencyGraph) => {
      graph.addNode(cacheKey, parent);

      for (const child of parent.children) {
        graph.addNode(`child/${child.id}`, child);
        graph.addDependency(`child/${child.id}`, `parent/${parent.id}`);
      }
    });

    return parent;
  }
}
```

## License

[MIT](LICENSE)
