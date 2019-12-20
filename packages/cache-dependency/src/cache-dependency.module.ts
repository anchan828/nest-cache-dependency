import {
  CacheModule,
  CacheModuleAsyncOptions,
  CacheModuleOptions,
  DynamicModule,
  Global,
  Module,
  Provider,
} from "@nestjs/common";
import { CacheDependencyInterceptor } from "./cache-dependency.interceptor";
import { CacheDependencyService } from "./cache-dependency.service";

/**
 * Module that provides cache dependency.
 * This module wraps the official CacheModule.
 * @export
 * @class CacheDependencyModule
 */
@Global()
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
      providers: this.providers,
      exports: this.providers,
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
      providers: this.providers,
      exports: this.providers,
    };
  }

  private static providers: Provider[] = [CacheDependencyService, CacheDependencyInterceptor];
}
