import { CACHE_MANAGER } from "@nestjs/common";
import { CACHE_MODULE_OPTIONS } from "@nestjs/common/cache/cache.constants";
import { Test, TestingModule } from "@nestjs/testing";
import { CacheDependencyInterceptor } from "./cache-dependency.interceptor";
import { CacheDependencyModule } from "./cache-dependency.module";
import { CacheDependencyService } from "./cache-dependency.service";
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
});
