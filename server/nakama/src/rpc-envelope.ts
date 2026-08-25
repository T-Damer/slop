import {
  SlopDomainError,
  type RpcEnvelope,
} from "../../../packages/contracts/src/index.js";

export type SlopRpcHandler = (
  context: nkruntime.Context,
  logger: nkruntime.Logger,
  nakama: nkruntime.Nakama,
  payload: string,
) => unknown;

export function withRpcEnvelope(
  handler: SlopRpcHandler,
): nkruntime.RpcFunction {
  return (context, logger, nakama, payload) => {
    try {
      const envelope: RpcEnvelope = {
        ok: true,
        value: handler(context, logger, nakama, payload),
      };
      return JSON.stringify(envelope);
    } catch (error) {
      if (!(error instanceof SlopDomainError)) {
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
  };
}
