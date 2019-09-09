import { LiteralObject } from "@nestjs/common";

export interface RedisStoreArgs extends LiteralObject {
  ttl?: number;
  keyPrefix?: string;
}
