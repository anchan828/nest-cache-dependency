import * as LRUCache from "lru-cache";
import { SetOptions } from "lru-cache";
import * as rfdc from "rfdc";
export class InMemoryCacheService extends LRUCache<string, any> {
  private readonly rfdcClone = rfdc();

  constructor(readonly options?: LRUCache.Options<string, any>) {
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
    const cacheValue = this.rfdcClone(value);
    super.set(key, cacheValue, options);
    return cacheValue;
  }

  /**
   * Get value from key.
   * Note: value is cloned value.
   * @template V
   * @param {string} key
   * @return {*}  {(V | undefined)}
   * @memberof InMemoryCacheService
   */
  public get<V>(key: string): V | undefined {
    const cacheValue = super.get(key);
    return this.rfdcClone(cacheValue);
  }
}
