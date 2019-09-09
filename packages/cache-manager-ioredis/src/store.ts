import { Cache, CachingConfig } from "cache-manager";
import * as Redis from "ioredis";
class IORedisStore implements Omit<Cache, "wrap"> {
  private readonly redisCache: Redis.Redis;

  constructor(args: Redis.RedisOptions) {
    this.redisCache = new Redis(args);
  }

  set<T>(
    key: string,
    value: T,
    options: CachingConfig,
    callback?: ((error: Error | undefined) => void) | undefined,
  ): void;

  set<T>(key: string, value: T, ttl: number, callback?: ((error: Error | undefined) => void) | undefined): void;

  set<T>(key: string, value: T, options: CachingConfig): Promise<any>;

  set<T>(key: string, value: T, ttl: number): Promise<any>;

  set(key: any, value: any, ttlOrOptions: any, callback?: any): void | Promise<any> {
    return new Promise((resolve, reject): void => {
      if (!callback) {
        callback = (err: any, result: any): void => (err ? reject(err) : resolve(result));
      }

      let ttl = -1;

      if (typeof ttlOrOptions === "object" && ttlOrOptions.ttl) {
        ttl = ttlOrOptions.ttl;
      } else if (typeof ttlOrOptions === "number") {
        ttl = ttlOrOptions;
      }

      this.redisCache.setex(key, ttl, JSON.stringify(value) || '"undefined"', this.handleResponse(callback));
    });
  }

  get<T>(key: string, callback: (error: Error | undefined, result: T) => void): void;

  get<T>(key: string): Promise<any>;

  get(key: any, callback?: any): void | Promise<any> {
    return new Promise((resolve, reject): void => {
      if (!callback) {
        callback = (err: any, result: any): void => (err ? reject(err) : resolve(result));
      }

      this.redisCache.get(key, this.handleResponse(callback, true));
    });
  }

  del(key: string, callback: (error: Error | undefined) => void): void;

  del(key: string): Promise<any>;

  del(key: any, callback?: any): void | Promise<any> {
    return new Promise((resolve, reject): void => {
      if (!callback) {
        callback = (err: any, result: any): void => (err ? reject(err) : resolve(result));
      }
      this.redisCache
        .del(key)
        .then(() => callback())
        .catch(e => callback(e));
    });
  }

  keys(callback: (error: Error | undefined, result: string[]) => void): void;

  keys(): Promise<string[]>;

  keys(callback?: (error: Error | undefined, result: string[]) => void): void | Promise<string[]> {
    return new Promise((resolve, reject): void => {
      if (!callback) {
        callback = (err: any, result: any): void => (err ? reject(err) : resolve(result));
      }
      this.redisCache
        .keys("*")
        .then(keys => {
          if (callback) {
            callback(undefined, keys);
          }
        })
        .catch(e => {
          if (callback) {
            callback(e, []);
          }
        });
    });
  }

  private handleResponse(
    callback: (error: Error | undefined, result?: any) => void,
    parse = false,
  ): (error: Error | undefined, result: any) => void {
    return (err: Error | undefined, result: any): void => {
      if (err) {
        return callback && callback(err);
      }

      if (parse) {
        try {
          result = JSON.parse(result, (key: string, value: any): any => {
            if (typeof value === "string") {
              const date = Date.parse(value);
              if (!isNaN(date)) {
                return new Date(date);
              }
            }
            return value;
          });
        } catch (e) {
          return callback && callback(e);
        }
      }

      return callback && callback(undefined, result);
    };
  }
}

export const redisStore = {
  create: (args: any): IORedisStore => new IORedisStore(args),
};
