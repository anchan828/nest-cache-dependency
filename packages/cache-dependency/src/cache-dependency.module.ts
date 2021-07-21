import {
  CacheModule,
  CacheModuleAsyncOptions,
  CacheOptionsFactory,
  DynamicModule,
  Global,
  Module,
  Provider,
  Type,
} from "@nestjs/common";
import { CacheDependencyInterceptor } from "./cache-dependency.interceptor";
import { CacheDependencyModuleOptions } from "./cache-dependency.interface";
import { CacheDependencyService } from "./cache-dependency.service";
import { CACHE_DEPENDENCY_MODULE_OPTIONS } from "./constants";

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
   * @param {CacheDependencyModuleOptions} [options={}]
   * @returns {DynamicModule}
   * @memberof CacheDependencyModule
   */
  public static register(options: CacheDependencyModuleOptions = {}): DynamicModule {
    const providers: Provider[] = [...this.providers, { provide: CACHE_DEPENDENCY_MODULE_OPTIONS, useValue: options }];

    return {
      module: CacheDependencyModule,
      imports: [CacheModule.register(options)],
      providers,
      exports: providers,
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
    const providers: Provider[] = [...this.providers, ...this.createAsyncProviders(options)];
    return {
      module: CacheDependencyModule,
      imports: [CacheModule.registerAsync(options)],
      providers,
      exports: providers,
    };
  }

  private static createAsyncProviders(options: CacheModuleAsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }
    const asyncProviders = [this.createAsyncOptionsProvider(options)];

    if (options.useClass) {
      asyncProviders.push({
        provide: options.useClass,
        useClass: options.useClass,
      });
    }

    return asyncProviders;
  }

  private static createAsyncOptionsProvider(options: CacheModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: CACHE_DEPENDENCY_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    const injects: Type<CacheOptionsFactory>[] = [];
    const inject = options.useExisting || options.useClass;

    if (inject) {
      injects.push(inject);
    }

    return {
      provide: CACHE_DEPENDENCY_MODULE_OPTIONS,
      useFactory: async (optionsFactory: CacheOptionsFactory) => optionsFactory.createCacheOptions(),
      inject: injects,
    };
  }

  private static providers: Provider[] = [CacheDependencyService, CacheDependencyInterceptor];
}
