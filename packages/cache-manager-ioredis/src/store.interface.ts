import { LiteralObject } from "@nestjs/common";

export interface RedisStoreArgs extends LiteralObject {
  ttl?: number;
  keyPrefix?: string;
  // If enabled, you can cache results of redis to in-memory.
  enabledInMemory?: boolean;
  // If enabledInMemory is enabled, you can set ttl of in-memory.
  inMemoryTTL?: number;
}
