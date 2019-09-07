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
import { CacheDependency } from "../cache-dependency.decorator";
import { CacheDependencyInterceptor } from "../cache-dependency.interceptor";
import { CacheDependencyGraph } from "../cache-dependency.interface";
import { CacheDependencyModule } from "../cache-dependency.module";
import { CacheDependencyService } from "../cache-dependency.service";
import { wait } from "../test.utils";
interface Parent {
  id: number;
  name: string;
  children: Child[];
}

interface Child {
  id: number;
  name: string;
}

@Injectable()
export class UseWithControllerService {
  public getParent(parentID: number): Parent {
    return {
      id: parentID,
      name: "parent",
      children: [
        {
          id: parentID + 1,
          name: "child 1",
        },
        {
          id: parentID + 2,
          name: "child 2",
        },
        {
          id: parentID + 3,
          name: "child 3",
        },
      ],
    };
  }
}

@Controller()
@UseInterceptors(CacheDependencyInterceptor)
export class UseWithControllerController {
  constructor(
    private readonly service: UseWithControllerService,
    private readonly cacheService: CacheDependencyService,
  ) {}

  @Get("no-cache/:parentID")
  @CacheDependency<Parent>((o: Parent, graph: CacheDependencyGraph) => {
    graph.addNode(`parent/${o.id}`, o);

    for (const child of o.children) {
      graph.addNode(`child/${child.id}`, child);
      graph.addDependency(`child/${child.id}`, `parent/${o.id}`);
    }
  })
  public async test(@Param("parentID", ParseIntPipe) parentID: number): Promise<Parent> {
    return this.service.getParent(parentID);
  }

  @Get("cache/:parentID")
  @CacheKey("parent/:parentID")
  @CacheDependency<Parent>((o: Parent, graph: CacheDependencyGraph) => {
    for (const child of o.children) {
      graph.addNode(`child/${child.id}`, child);
      graph.addDependency(`child/${child.id}`, `parent/${o.id}`);
    }
  })
  public async test2(@Param("parentID", ParseIntPipe) parentID: number): Promise<Parent> {
    return this.service.getParent(parentID);
  }

  @Get("cache-only/:parentID")
  public async cache(@Param("parentID", ParseIntPipe) parentID: number): Promise<Parent> {
    return this.cacheService.getCache<Parent>(`parent/${parentID}`);
  }

  @Delete("child/:childID")
  public async deleteChild(@Param("childID", ParseIntPipe) childID: number): Promise<void> {
    await this.cacheService.clearCacheDependencies(`child/${childID}`);
  }
}

@Module({
  imports: [CacheDependencyModule.register()],
  providers: [UseWithControllerService],
  controllers: [UseWithControllerController],
})
export class UseWithControllerModule {}

describe("1. Use with Controller", () => {
  it("test", async () => {
    const module = await Test.createTestingModule({
      imports: [UseWithControllerModule],
    }).compile();

    const app = await module.createNestApplication().init();
    const parentID = Date.now();
    await request(app.getHttpServer())
      .get(`/cache-only/${parentID}`)
      .expect(200)
      .expect({});

    const result = {
      id: parentID,
      name: "parent",
      children: [
        { id: parentID + 1, name: "child 1" },
        { id: parentID + 2, name: "child 2" },
        { id: parentID + 3, name: "child 3" },
      ],
    };

    await wait(500);
    await request(app.getHttpServer())
      .get(`/no-cache/${parentID}`)
      .expect(200)
      .expect(result);

    await wait(500);
    await request(app.getHttpServer())
      .get(`/cache/${parentID}`)
      .expect(200)
      .expect(result);
    await wait(500);
    await request(app.getHttpServer())
      .get(`/cache-only/${parentID}`)
      .expect(200)
      .expect(result);
    await wait(500);
    await request(app.getHttpServer())
      .delete(`/child/${parentID + 3}`)
      .expect(200);
    await wait(500);
    await request(app.getHttpServer())
      .get(`/cache-only/${parentID}`)
      .expect(200)
      .expect({});

    await app.close();
  });
});
