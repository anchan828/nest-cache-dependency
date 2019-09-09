import { CacheStore } from "@nestjs/common";

export type CacheManager = Omit<CacheStore, "get"> & {
  name: string;
  get<T>(key: string): Promise<T | undefined>;
  keys(pattern?: string): Promise<string[]>;
  reset(): Promise<void>;
  mget<T>(keys: string[]): Promise<Array<T | undefined>>;
  mset<T>(...keyOrValues: Array<string | T>): Promise<void>;
};
