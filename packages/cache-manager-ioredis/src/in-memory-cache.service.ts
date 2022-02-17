import * as LRUCache from "lru-cache";
import * as rfdc from "rfdc";
export class InMemoryCacheService {
  private readonly cache: LRUCache<string, any>;

  private readonly rfdcClone = rfdc();

  constructor(readonly options?: LRUCache.Options<string, any>) {
    this.cache = new LRUCache(options);
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
  public set<T>(key: string, value: T, options: LRUCache.SetOptions<T>): T {
    const cacheValue = this.rfdcClone(value);
    this.cache.set(key, cacheValue, options);
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
    const cacheValue = this.cache.get(key);
    return this.rfdcClone(cacheValue);
  }

  public delete(key: string): void {
    this.cache.delete(key);
  }

  public prune(): void {
    this.cache.prune();
  }

  public clear(): void {
    this.cache.clear();
  }
}
