import { CacheModule, CacheModuleAsyncOptions, CacheModuleOptions, DynamicModule, Module } from "@nestjs/common";
import { CacheDependencyInterceptor } from "./cache-dependency.interceptor";
import { CacheDependencyService } from "./cache-dependency.service";

@Module({})
export class CacheDependencyModule {
  public static register(options: CacheModuleOptions = {}): DynamicModule {
    return {
      module: CacheDependencyModule,
      imports: [CacheModule.register(options)],
      providers: [CacheDependencyService, CacheDependencyInterceptor],
      exports: [CacheDependencyService, CacheDependencyInterceptor],
    };
  }

  public static registerAsync(options: CacheModuleAsyncOptions): DynamicModule {
    return {
      module: CacheDependencyModule,
      imports: [CacheModule.registerAsync(options)],
      providers: [CacheDependencyService, CacheDependencyInterceptor],
      exports: [CacheDependencyService, CacheDependencyInterceptor],
    };
  }
}
