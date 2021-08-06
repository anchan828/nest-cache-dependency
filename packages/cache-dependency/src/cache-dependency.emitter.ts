import { Injectable } from "@nestjs/common";
import { EventEmitter } from "events";
import TypedEmitter from "typed-emitter";

interface CacheDependencyMessageEvents {
  delete: (keys: string[]) => void;
}

@Injectable()
export class CacheDependencyEventEmitter extends (EventEmitter as new () => TypedEmitter<CacheDependencyMessageEvents>) {}
