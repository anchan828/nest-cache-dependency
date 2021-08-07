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
   * @type {boolean}
   * @memberof RedisStoreArgs
   */
  enabledInMemory?: boolean;

  /**
   * If enabledInMemory is enabled, you can set ttl of in-memory. The ttl in seconds.
   *
   * @type {number}
   * @memberof RedisStoreArgs
   */
  inMemoryTTL?: number;
}

export type CallbackFunction = (err?: Error | null, result?: any | null) => void;
