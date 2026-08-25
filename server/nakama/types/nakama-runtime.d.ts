declare namespace nkruntime {
  interface Context {
    readonly userId?: string;
  }

  interface Logger {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
  }

  interface StorageReadRequest {
    readonly collection: string;
    readonly key: string;
    readonly userId: string;
  }

  interface StorageObject {
    readonly collection: string;
    readonly key: string;
    readonly userId: string;
    readonly value: unknown;
    readonly version: string;
  }

  interface StorageWriteRequest {
    readonly collection: string;
    readonly key: string;
    readonly userId: string;
    readonly value: unknown;
    readonly version?: string;
    readonly permissionRead: number;
    readonly permissionWrite: number;
  }

  interface StorageWriteAck {
    readonly collection: string;
    readonly key: string;
    readonly userId: string;
    readonly version: string;
  }

  interface Nakama {
    storageRead(requests: ReadonlyArray<StorageReadRequest>): Array<StorageObject>;
    storageWrite(requests: ReadonlyArray<StorageWriteRequest>): Array<StorageWriteAck>;
  }

  type RpcFunction = (
    context: Context,
    logger: Logger,
    nakama: Nakama,
    payload: string,
  ) => string;

  interface Initializer {
    registerRpc(id: string, handler: RpcFunction): void;
  }
}
