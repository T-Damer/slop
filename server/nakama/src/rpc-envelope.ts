import {
  type RpcEnvelope,
} from "../../../packages/contracts/src/index.js";

export type SlopRpcHandler = (
  context: nkruntime.Context,
  logger: nkruntime.Logger,
  nakama: nkruntime.Nakama,
  payload: string,
) => unknown;

interface SlopErrorLike {
  readonly code: string;
  readonly message: string;
}

export function executeRpcEnvelope(
  handler: SlopRpcHandler,
  context: nkruntime.Context,
  logger: nkruntime.Logger,
  nakama: nkruntime.Nakama,
  payload: string,
): string {
  try {
    const envelope: RpcEnvelope = {
      ok: true,
      value: handler(context, logger, nakama, payload),
    };
    return JSON.stringify(envelope);
  } catch (error) {
    if (!isSlopError(error)) {
      throw error;
    }
    const envelope: RpcEnvelope = {
      ok: false,
      error: {
        code: error.code,
        message: error.message,
      },
    };
    return JSON.stringify(envelope);
  }
}

function isSlopError(error: unknown): error is SlopErrorLike {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const candidate = error as Partial<SlopErrorLike>;
  return (
    typeof candidate.code === "string" &&
    typeof candidate.message === "string"
  );
}
