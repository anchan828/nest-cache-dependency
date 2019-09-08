import { CacheModule, CacheModuleAsyncOptions, CacheModuleOptions, DynamicModule, Module } from "@nestjs/common";
import { CacheDependencyInterceptor } from "./cache-dependency.interceptor";
import { CacheDependencyService } from "./cache-dependency.service";

/**
 * Module that provides cache dependency.
 * This module wraps the official CacheModule.
 * @export
 * @class CacheDependencyModule
 */
@Module({})
export class CacheDependencyModule {
  /**
   * Configure the cache dependency statically.
   *
   * @static
   * @param {CacheModuleOptions} [options={}]
   * @returns {DynamicModule}
   * @memberof CacheDependencyModule
   */
  public static register(options: CacheModuleOptions = {}): DynamicModule {
    return {
      module: CacheDependencyModule,
      imports: [CacheModule.register(options)],
      providers: [CacheDependencyService, CacheDependencyInterceptor],
      exports: [CacheDependencyService, CacheDependencyInterceptor],
    };
  }

  /**
   * Configure the cache dependency dynamically.
   *
   * @static
   * @param {CacheModuleAsyncOptions} options
   * @returns {DynamicModule}
   * @memberof CacheDependencyModule
   */
  public static registerAsync(options: CacheModuleAsyncOptions): DynamicModule {
    return {
      module: CacheDependencyModule,
      imports: [CacheModule.registerAsync(options)],
      providers: [CacheDependencyService, CacheDependencyInterceptor],
      exports: [CacheDependencyService, CacheDependencyInterceptor],
    };
  }
}
