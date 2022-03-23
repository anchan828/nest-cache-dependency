import * as LRUCache from "lru-cache";
import { SetOptions } from "lru-cache";
export class InMemoryCacheService extends LRUCache<string, any> {
  constructor(readonly options: LRUCache.Options<string, any>) {
    super(options);
  }

  /**
   * Set key/value and returns cloned value
   *
   * @template T
   * @param {string} key
   * @param {T} value
   * @param {LRUCache.SetOptions<T>} options
   * @return {*}  {T}
   * @memberof InMemoryCacheService
   */
  public set<T>(key: string, value: T, options: SetOptions<string, T>): T {
    const cacheValue = this.copy(value);
    super.set(key, cacheValue, options);
    return cacheValue;
  }

  /**
   * Get value from key.
   * Note: value is cloned value.
   * @template T
   * @param {string} key
   * @return {*}  {(V | undefined)}
   * @memberof InMemoryCacheService
   */
  public get<T>(key: string): T | undefined {
    const cacheValue = super.get(key);
    return this.copy(cacheValue);
  }

  private copy<T>(value: T): T {
    if (Array.isArray(value)) {
      return value.map(this.copy) as unknown as T;
    }

    if (typeof value === "object") {
      return { ...value };
    }

    return value;
  }
}
