import { CacheStore } from "@nestjs/common";

export type CacheManager = CacheStore & {
  name: string;
  keys(pattern?: string): Promise<string[]>;
  reset(): Promise<void>;
  mget<T>(keys: string[]): Promise<Array<T | undefined>>;
  mset<T>(...keyOrValues: Array<string | T>): Promise<void>;
};
