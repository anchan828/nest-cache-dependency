import { Injectable, Logger } from "@nestjs/common";
import * as Redis from "ioredis";
import { CacheDependencyEventEmitter } from "./cache-dependency.emitter";
import { CacheDependencyPubSubMessage } from "./cache-dependency.interface";
import { CACHE_DEPENDENCY_MODULE, CACHE_DEPENDENCY_PUBSUB_DELETE_CHANNEL_EVENT } from "./constants";
/**
 * pubsub service
 *
 * @export
 * @class CacheDependencyPubSubService
 */
@Injectable()
export class CacheDependencyPubSubService {
  private readonly logger = new Logger(CACHE_DEPENDENCY_MODULE);

  private publisher!: Redis.Redis;

  private subscriber!: Redis.Redis;

  private instanceId: string = Date.now().toString();

  constructor(private readonly emitter: CacheDependencyEventEmitter) {}

  public async init(pubsubOptions: Redis.RedisOptions): Promise<this> {
    this.publisher = new Redis(pubsubOptions);
    this.subscriber = new Redis(pubsubOptions);

    await this.subscriber.subscribe(CACHE_DEPENDENCY_PUBSUB_DELETE_CHANNEL_EVENT);

    this.subscriber.on("message", this.handleMessageEvent.bind(this));
    this.emitter.on("deleted", this.publishDeletedEvent.bind(this));
    this.logger.log(`[${this.instanceId}] PubSub initialized`);
    return this;
  }

  public async close(): Promise<void> {
    await this.publisher.quit();
    await this.subscriber.quit();
    this.logger.log(`[${this.instanceId}] PubSub quit`);
  }

  private async handleMessageEvent(channel: string, raw: string): Promise<void> {
    const message = JSON.parse(raw) as CacheDependencyPubSubMessage;

    if (message.instanceId === this.instanceId) {
      return;
    }

    if (channel === CACHE_DEPENDENCY_PUBSUB_DELETE_CHANNEL_EVENT) {
      this.emitter.emit("delete", message.data);
    }
  }

  private async publishDeletedEvent(keys: string[]): Promise<void> {
    console.log("call");
    await this.publisher.publish(
      CACHE_DEPENDENCY_PUBSUB_DELETE_CHANNEL_EVENT,
      JSON.stringify({
        instanceId: this.instanceId,
        data: keys,
      }),
    );
  }
}
