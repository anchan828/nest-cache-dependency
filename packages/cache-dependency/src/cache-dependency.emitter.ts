import { Injectable } from "@nestjs/common";
import { EventEmitter } from "events";
import TypedEmitter from "typed-emitter";

interface CacheDependencyMessageEvents {
  deleted: (keys: string[]) => void;
  delete: (keys: string[]) => void;
}

@Injectable()
export class CacheDependencyEventEmitter extends (EventEmitter as new () => TypedEmitter<CacheDependencyMessageEvents>) {}
