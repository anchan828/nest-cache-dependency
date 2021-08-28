import { CallbackFunction } from "./store.interface";

export function CallbackDecorator(): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let callback: CallbackFunction | undefined;

      if (typeof args[args.length - 1] === "function") {
        callback = args.pop();
      }

      try {
        const result = await (originalMethod.apply(this, args) as Promise<any>);
        if (callback) {
          return callback(null, result);
        }
        return Promise.resolve(result);
      } catch (err: any) {
        if (callback) {
          return callback(err, null);
        }

        return Promise.reject(err);
      }
    };

    return descriptor;
  };
}

export function DelCallbackDecorator(): MethodDecorator {
  return (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      let callback: CallbackFunction | undefined;

      if (typeof args[args.length - 1] === "function") {
        callback = args.pop();
      }

      try {
        const result = await (originalMethod.apply(this, args) as Promise<any>);

        if (callback) {
          callback(null, result);
        }

        return Promise.resolve(result);
      } catch (err: any) {
        if (callback) {
          return;
        }

        return Promise.reject(err);
      }
    };

    return descriptor;
  };
}
