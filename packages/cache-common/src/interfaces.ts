import { CacheStore } from "@nestjs/common";

export interface CacheManagerSetOptions {
  ttl?: number;
}

export type CacheManager = CacheStore & {
  name: string;
  set<T>(key: string, value: T, options?: CacheManagerSetOptions): Promise<void> | void;
  keys(pattern?: string): Promise<string[]>;
  reset(): Promise<void>;
  mget<T>(...keys: string[]): Promise<Array<T | undefined>>;

  /**
   * You can set options to last argument
   */
  mset<T>(...keyOrValues: Array<string | T | CacheManagerSetOptions>): Promise<void>;
  del(...keys: string[]): Promise<void>;
};
