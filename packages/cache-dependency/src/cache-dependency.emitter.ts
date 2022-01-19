import { Injectable } from "@nestjs/common";
import { EventEmitter } from "events";
import TypedEmitter from "typed-emitter";

type CacheDependencyMessageEvents = {
  deleted: (keys: string[]) => void;
  delete: (keys: string[]) => void;
};

@Injectable()
export class CacheDependencyEventEmitter extends (EventEmitter as unknown as new () => TypedEmitter<CacheDependencyMessageEvents>) {}
