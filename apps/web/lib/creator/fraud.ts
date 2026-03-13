import { evaluateTipFraud } from "../../../../packages/payments/core.mjs";

export type CreatorTipFraudInput = {
  fanId: string;
  creatorId: string;
  amountCents: number;
  ipAddress?: string | null;
  deviceId?: string | null;
  createdAt?: string;
};

export type CreatorTipFraudState = {
  tips: Record<string, unknown>;
};

export function scoreCreatorTipFraud(input: CreatorTipFraudInput, state: CreatorTipFraudState, now?: number) {
  return evaluateTipFraud(input, state, now);
}
