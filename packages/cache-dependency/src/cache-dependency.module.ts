import { CacheManager } from "@anchan828/nest-cache-common";
import {
  CacheModule,
  CACHE_MANAGER,
  DynamicModule,
  Global,
  Inject,
  Module,
  OnModuleDestroy,
  OnModuleInit,
  Provider,
  Type,
} from "@nestjs/common";
import { CacheDependencyPubSubService } from "./cache-dependency-pubsub.service";
import { CacheDependencyEventEmitter } from "./cache-dependency.emitter";
import { CacheDependencyInterceptor } from "./cache-dependency.interceptor";
import {
  CacheDependencyModuleAsyncOptions,
  CacheDependencyModuleOptions,
  CacheDependencyModuleOptionsFactory,
} from "./cache-dependency.interface";
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
export class CacheDependencyModule implements OnModuleInit, OnModuleDestroy {
  private pubsubServices: CacheDependencyPubSubService[] = [];

  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: CacheManager,
    private readonly emitter: CacheDependencyEventEmitter,
    @Inject(CACHE_DEPENDENCY_MODULE_OPTIONS)
    private readonly options: CacheDependencyModuleOptions,
  ) {}

  async onModuleInit(): Promise<void> {
    if (Array.isArray(this.options)) {
      for (const opt of this.options) {
        if (opt.pubsub) {
          this.pubsubServices.push(await new CacheDependencyPubSubService(this.emitter).init(opt.pubsub));
        }
      }
    } else if (this.options.pubsub) {
      this.pubsubServices.push(await new CacheDependencyPubSubService(this.emitter).init(this.options.pubsub));
    }
  }

  async onModuleDestroy(): Promise<void> {
    for (const pubsubService of this.pubsubServices) {
      await pubsubService.close();
    }
    this.emitter.removeAllListeners();
    await this.cacheManager?.store?.close?.();
  }

  /**
   * Configure the cache dependency statically.
   *
   * @static
   * @param {CacheDependencyModuleOptions} [options={}]
   * @returns {DynamicModule}
   * @memberof CacheDependencyModule
   */
  public static register(options: CacheDependencyModuleOptions | CacheDependencyModuleOptions[] = {}): DynamicModule {
    const providers: Provider[] = [...this.providers, { provide: CACHE_DEPENDENCY_MODULE_OPTIONS, useValue: options }];

    return {
      module: CacheDependencyModule,
      imports: [CacheModule.register(options)],
      providers: [...providers, CacheDependencyEventEmitter],
      exports: providers,
    };
  }

  /**
   * Configure the cache dependency dynamically.
   *
   * @static
   * @param {CacheDependencyModuleAsyncOptions} options
   * @returns {DynamicModule}
   * @memberof CacheDependencyModule
   */
  public static registerAsync(options: CacheDependencyModuleAsyncOptions): DynamicModule {
    const providers: Provider[] = [...this.providers, ...this.createAsyncProviders(options)];
    return {
      module: CacheDependencyModule,
      imports: [CacheModule.registerAsync(options), ...(options.imports || [])],
      providers: [...providers, CacheDependencyEventEmitter],
      exports: providers,
    };
  }

  private static createAsyncProviders(options: CacheDependencyModuleAsyncOptions): Provider[] {
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

  private static createAsyncOptionsProvider(options: CacheDependencyModuleAsyncOptions): Provider {
    if (options.useFactory) {
      return {
        provide: CACHE_DEPENDENCY_MODULE_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      };
    }

    const injects: Type<CacheDependencyModuleOptionsFactory>[] = [];
    const inject = options.useExisting || options.useClass;

    if (inject) {
      injects.push(inject);
    }

    return {
      provide: CACHE_DEPENDENCY_MODULE_OPTIONS,
      useFactory: async (optionsFactory: CacheDependencyModuleOptionsFactory) => optionsFactory.createCacheOptions(),
      inject: injects,
    };
  }

  private static providers: Provider[] = [CacheDependencyService, CacheDependencyInterceptor];
}
