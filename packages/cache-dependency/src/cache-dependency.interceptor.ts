import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { CACHE_KEY_METADATA } from "@nestjs/common/cache/cache.constants";
import { Reflector } from "@nestjs/core";
import { DepGraph } from "dependency-graph";
import * as Route from "route-parser";
import { Observable, of } from "rxjs";
import { tap } from "rxjs/operators";
import { CacheDependencyFunction } from "./cache-dependency.interface";
import { CacheDependencyService } from "./cache-dependency.service";
import { CACHE_DEPENDENCY_KEY_METADATA } from "./constants";
@Injectable()
export class CacheDependencyInterceptor implements NestInterceptor {
  constructor(private service: CacheDependencyService, private readonly reflector: Reflector) {}

  public async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    let cacheKey = this.reflector.get(CACHE_KEY_METADATA, context.getHandler()) as string;
    if (cacheKey) {
      const params = context.switchToHttp().getRequest().params;
      const route = new Route(cacheKey.replace(/::/g, "__cache_key_encoded__:")).reverse(params);
      if (route) {
        cacheKey = route.replace(/__cache_key_encoded__/g, ":");
        const value = await this.service.getCache(cacheKey);
        if (value) {
          return of(value);
        }
      }
    }

    const func: CacheDependencyFunction<any> = this.reflector.get(CACHE_DEPENDENCY_KEY_METADATA, context.getHandler());
    if (!func) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async response => {
        const graph = new DepGraph<any>({ circular: true });
        if (cacheKey) {
          graph.addNode(cacheKey, response);
        }
        func(response, graph);
        await this.service.createCacheDependencies(graph);
      }),
    );
  }
}
