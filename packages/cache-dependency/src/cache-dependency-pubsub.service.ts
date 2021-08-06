import { Inject, Injectable, Logger } from "@nestjs/common";
import * as Redis from "ioredis";
import { CacheDependencyEventEmitter } from "./cache-dependency.emitter";
import { CacheDependencyModuleOptions, CacheDependencyPubSubMessage } from "./cache-dependency.interface";
import {
  CACHE_DEPENDENCY_MODULE,
  CACHE_DEPENDENCY_MODULE_OPTIONS,
  CACHE_DEPENDENCY_PUBSUB_DELETE_CHANNEL_EVENT,
} from "./constants";
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

  constructor(
    @Inject(CACHE_DEPENDENCY_MODULE_OPTIONS)
    private readonly options: CacheDependencyModuleOptions,
    private readonly emitter: CacheDependencyEventEmitter,
  ) {}

  public async init(): Promise<void> {
    this.publisher = new Redis(this.options.pubsub);
    this.subscriber = new Redis(this.options.pubsub);

    await this.subscriber.subscribe(CACHE_DEPENDENCY_PUBSUB_DELETE_CHANNEL_EVENT);

    this.subscriber.on("message", this.handleMessageEvent.bind(this));
    this.emitter.on("deleted", this.publishDeletedEvent.bind(this));
    this.logger.log(`[${this.instanceId}] PubSub initialized`);
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

    this.logger.log(`[${this.instanceId}] Received ${raw} from ${channel}`);
  }

  private async publishDeletedEvent(keys: string[]): Promise<void> {
    await this.publisher.publish(
      CACHE_DEPENDENCY_PUBSUB_DELETE_CHANNEL_EVENT,
      JSON.stringify({
        instanceId: this.instanceId,
        data: keys,
      }),
    );
  }
}
