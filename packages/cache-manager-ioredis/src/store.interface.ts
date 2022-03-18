import { RedisOptions } from "ioredis";
export interface RedisStoreArgs extends RedisOptions {
  /**
   * The ttl in seconds.
   *
   * @type {number}
   * @memberof RedisStoreArgs
   */
  ttl?: number;

  /**
   * If enabled, you can cache results of redis to in-memory.
   *
   * @deprecated Use inMemory.enabled instead.
   * @type {boolean}
   * @memberof RedisStoreArgs
   */
  enabledInMemory?: boolean;

  /**
   * If enabledInMemory is enabled, you can set ttl of in-memory. The ttl in seconds.
   *
   * @deprecated Use inMemory.ttl instead.
   * @type {number}
   * @memberof RedisStoreArgs
   */
  inMemoryTTL?: number;

  inMemory?: {
    enabled?: boolean;
    ttl?: number;
    pruneInterval?: number;
    max?: number;
    /**
     * Called when the in-memory cache is hit.
     */
    hitCache?: (key: string) => void | Promise<void>;

    /**
     * Called when a cache is saved to the in-memory.
     */
    setCache?: (key: string, value: any, ttl?: number) => void | Promise<void>;
    /**
     * Called when a cache is deleted to the in-memory.
     */
    deleteCache?: (key: string) => void | Promise<void>;
  };
}

export type CallbackFunction = (err?: Error | null, result?: any | null) => void;
