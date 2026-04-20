import { useCallback } from "react";

export type PaymentSheetResult =
  | { success: true }
  | { success: false; canceled: boolean; error?: string };

export function useStripePaymentSheet() {
  const presentSheet = useCallback(
    async (_clientSecret: string): Promise<PaymentSheetResult> => {
      return { success: false, canceled: true };
    },
    [],
  );

  return { presentSheet };
}
