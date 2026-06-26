export interface MoMoWebhookPayload {
  referenceId: string;

  status: "SUCCESSFUL" | "FAILED" | "CANCELLED" | "PENDING";

  financialTransactionId?: string;

  externalId?: string;

  amount?: string;

  currency?: string;

  payer?: {
    partyId: string;
    partyIdType: string;
  };

  reason?: string;
}
