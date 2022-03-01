import { CacheStore } from "@nestjs/common";

export interface CacheManagerSetOptions {
  ttl?: number;
  inMmeoryTTL?: number;
}

export interface CacheManagerGetOptions {
  inMmeoryTTL?: number;
}

export type CacheManager = CacheStore & {
  name: string;
  set<T>(key: string, value: T, options?: CacheManagerSetOptions): Promise<void> | void;
  get<T>(key: string, options?: CacheManagerGetOptions): Promise<T | undefined>;
  keys(pattern?: string): Promise<string[]>;
  reset(): Promise<void>;
  mget<T>(...keys: string[]): Promise<Array<T | undefined>>;
  mget<T>(...keysOrOptions: [...string[], CacheManagerGetOptions | undefined]): Promise<Array<T | undefined>>;

  /**
   * You can set options to last argument
   */
  mset<T>(...keyOrValues: [...(string | T)[], CacheManagerSetOptions | undefined]): Promise<void>;
  del(...keys: string[]): Promise<void>;
  store?: any;
};
