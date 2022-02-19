import * as LRUCache from "lru-cache";
import { Options, SetOptions } from "lru-cache";

export const SimpleLRUCache = LRUCache;
export type SimpleLRUCache<K, V> = LRUCache<K, V>;
export type SimpleLRUCacheOptions<K, V> = Options<K, V>;
export type SimpleLRUCacheSetOptions<V> = SetOptions<V>;
