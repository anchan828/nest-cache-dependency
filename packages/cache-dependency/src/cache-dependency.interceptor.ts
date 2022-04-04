import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { CACHE_KEY_METADATA } from "@nestjs/common/cache/cache.constants";
import { Reflector } from "@nestjs/core";
import { DepGraph } from "dependency-graph";
import * as Route from "route-parser";
import { Observable, of } from "rxjs";
import { tap } from "rxjs/operators";
import { CacheDependencyFunction } from "./cache-dependency.interface";
import { CacheDependencyService } from "./cache-dependency.service";
import { CACHE_DEPENDENCY_KEY_METADATA, CLEAR_CACHE_DEPENDENCIES_KEY_MATADATA } from "./constants";
@Injectable()
export class CacheDependencyInterceptor implements NestInterceptor {
  constructor(private service: CacheDependencyService, private readonly reflector: Reflector) {}

  private applyCacheKeyParams(cacheKey: string, params: object = {}): string {
    const route = new Route(cacheKey.replace(/::/g, "__cache_key_encoded__:")).reverse(params);
    if (route) {
      return route.replace(/__cache_key_encoded__/g, ":");
    }
    return cacheKey;
  }

  public async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();

    const routeParams = request.params ?? {};
    const query = request.query ?? {};

    let wsParams = {};
    if (request.handshake) {
      const wsData = context.switchToWs().getData();
      if (wsData instanceof Object && !Array.isArray(wsData) && !Buffer.isBuffer(wsData)) wsParams = wsData;
    }

    const params = { ...routeParams, ...wsParams, ...query };
    let cacheKey = this.reflector.get(CACHE_KEY_METADATA, context.getHandler()) as string;

    if (cacheKey) {
      cacheKey = this.applyCacheKeyParams(cacheKey, params);
      const value = await this.service.get(cacheKey);
      if (value) {
        return of(value);
      }
    }

    const func: CacheDependencyFunction<any> = this.reflector.get(CACHE_DEPENDENCY_KEY_METADATA, context.getHandler());
    const clearCacheKeys: string[] = this.reflector.get(CLEAR_CACHE_DEPENDENCIES_KEY_MATADATA, context.getHandler());
    return next.handle().pipe(
      tap(async (response) => {
        if (cacheKey && !func) {
          await this.service.set(cacheKey, response);
        }
        if (func) {
          const graph = new DepGraph<any>({ circular: true });
          if (cacheKey) {
            graph.addNode(cacheKey, response);
          }
          func(cacheKey, response, graph, params);
          await this.service.createCacheDependencies(graph);
        }
        if (Array.isArray(clearCacheKeys)) {
          for (const clearCacheKey of clearCacheKeys) {
            if (!clearCacheKey) {
              continue;
            }

            await this.service.clearCacheDependencies(this.applyCacheKeyParams(clearCacheKey, params));
          }
        }
      }),
    );
  }
}
