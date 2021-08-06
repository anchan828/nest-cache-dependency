import {
  CacheModule,
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
@Module({ providers: [CacheDependencyPubSubService] })
export class CacheDependencyModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly pubsubService: CacheDependencyPubSubService,
    @Inject(CACHE_DEPENDENCY_MODULE_OPTIONS)
    private readonly options: CacheDependencyModuleOptions,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.options.pubsub) {
      await this.pubsubService.init();
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.options.pubsub) {
      await this.pubsubService.close();
    }
  }

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
