import { CACHE_MANAGER, Inject, Injectable } from "@nestjs/common";
import { CACHE_MODULE_OPTIONS } from "@nestjs/common/cache/cache.constants";
import { ConfigModule, registerAs } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { CacheDependencyInterceptor } from "./cache-dependency.interceptor";
import { CacheDependencyModuleOptions, CacheDependencyModuleOptionsFactory } from "./cache-dependency.interface";
import { CacheDependencyModule } from "./cache-dependency.module";
import { CacheDependencyService } from "./cache-dependency.service";
import { CACHE_DEPENDENCY_MODULE_OPTIONS } from "./constants";
describe("CacheDependencyModule", () => {
  describe("register", () => {
    it("should compile", async () => {
      await expect(
        Test.createTestingModule({
          imports: [CacheDependencyModule.register()],
        }).compile(),
      ).resolves.toBeDefined();
    });
  });

  describe("registerAsync", () => {
    it("should compile", async () => {
      await expect(
        Test.createTestingModule({
          imports: [
            CacheDependencyModule.registerAsync({
              useFactory: () => {
                return {};
              },
            }),
          ],
        }).compile(),
      ).resolves.toBeDefined();
    });
  });

  describe("get providers", () => {
    let app: TestingModule;
    beforeEach(async () => {
      app = await Test.createTestingModule({
        imports: [
          CacheDependencyModule.registerAsync({
            useFactory: () => ({
              ttl: 100,
            }),
          }),
        ],
      }).compile();
    });

    it("should get cache manager", () => {
      expect(app.get(CACHE_MANAGER)).toBeDefined();
    });

    it("should get cache option", () => {
      expect(app.get(CACHE_MODULE_OPTIONS)).toEqual({
        ttl: 100,
      });
    });

    it("should get CacheDependencyService", () => {
      expect(app.get(CacheDependencyService)).toBeDefined();
    });
    it("should get CacheDependencyInterceptor", () => {
      expect(app.get(CacheDependencyInterceptor)).toBeDefined();
    });
  });

  describe("use config", () => {
    it("should compile", async () => {
      const config = registerAs("abc", () => ({ version: "version" }));

      @Injectable()
      class Options implements CacheDependencyModuleOptionsFactory {
        constructor(@Inject(config.KEY) private readonly conf: { version: string }) {}

        createCacheOptions(): CacheDependencyModuleOptions | Promise<CacheDependencyModuleOptions> {
          return {
            cacheDependencyVersion: this.conf.version,
          };
        }
      }

      @Injectable()
      class Service {
        constructor(@Inject(CACHE_DEPENDENCY_MODULE_OPTIONS) private options: CacheDependencyModuleOptions) {}

        public getOptions() {
          return this.options;
        }
      }

      const moduleRef = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot(),
          CacheDependencyModule.registerAsync({
            imports: [ConfigModule.forFeature(config)],
            inject: [config],
            useClass: Options,
          }),
        ],
        providers: [Service],
      }).compile();
      expect(moduleRef).toBeDefined();
      expect(moduleRef.get(Service).getOptions()).toEqual({ cacheDependencyVersion: "version" });
    });
  });

  describe("use pubsub", () => {
    it("should compile", async () => {
      const module = await Test.createTestingModule({
        imports: [CacheDependencyModule.register({ pubsub: { host: "localhost" } })],
      }).compile();

      const app = await module.init();
      expect(app).toBeDefined();
      await app.close();
    });
  });
});
