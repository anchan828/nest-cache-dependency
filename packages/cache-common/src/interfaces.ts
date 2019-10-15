import { CacheStore } from "@nestjs/common";

export interface CacheManagerSetOptions {
  ttl?: number;
}

export type CacheManager = CacheStore & {
  name: string;
  set<T>(key: string, value: T, options?: CacheManagerSetOptions): Promise<void> | void;
  keys(pattern?: string): Promise<string[]>;
  reset(): Promise<void>;
  mget<T>(keys: string[]): Promise<Array<T | undefined>>;
  mset<T>(...keyOrValues: Array<string | T>): Promise<void>;
};
