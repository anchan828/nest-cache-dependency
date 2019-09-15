# @anchan828/nest-cache-manager-ioredis

![npm](https://img.shields.io/npm/v/@anchan828/nest-cache-manager-ioredis.svg)
![NPM](https://img.shields.io/npm/l/@anchan828/nest-cache-manager-ioredis.svg)

## Description

Redis store for node-cache-manager using IORedis.

## Installation

```bash
$ npm i --save @anchan828/nest-cache-manager-ioredis
```

## Quick Start

```ts
import { redisStore } from "@anchan828/nest-cache-manager-ioredis";
import { caching } from "cache-manager";

caching({
  store: redisStore,
  host: "localhost",
});
```

## Use memory store

You can cache results of redis to in-memory.

```ts
caching({
  store: redisStore,
  host: "localhost",
  enabledInMemory: true, // default: false
  inMemoryTTL: 5, // default: 5
});
```

## Notes

- Using IORedis v4
- JSON.parse has reviver for Date.parse

## License

[MIT](LICENSE)
