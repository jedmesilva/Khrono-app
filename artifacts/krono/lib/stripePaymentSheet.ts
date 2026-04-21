import { useStripe, useConfirmPayment } from "@stripe/stripe-react-native";
import { useCallback } from "react";

export type PaymentSheetResult =
  | { success: true }
  | { success: false; canceled: boolean; error?: string };

/** @deprecated Use useStripeCardConfirm for a fully native card form. */
export function useStripePaymentSheet() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const presentSheet = useCallback(
    async (clientSecret: string): Promise<PaymentSheetResult> => {
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "Krono",
        returnURL: "krono://stripe-return",
        defaultBillingDetails: {},
        style: "alwaysDark",
        appearance: {
          colors: {
            primary: "#e06030",
            background: "#111010",
            componentBackground: "#1a1917",
            componentBorder: "#2a2826",
            componentDivider: "#2a2826",
            primaryText: "#f2efe9",
            secondaryText: "#9b9487",
            componentText: "#f2efe9",
            placeholderText: "#9b9487",
            icon: "#9b9487",
            error: "#e05050",
          },
          shapes: {
            borderRadius: 12,
            borderWidth: 1,
          },
          primaryButton: {
            colors: {
              background: "#e06030",
              text: "#ffffff",
            },
            shapes: {
              borderRadius: 12,
            },
          },
        },
      });

      if (initError) {
        return { success: false, canceled: false, error: initError.message };
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === "Canceled") {
          return { success: false, canceled: true };
        }
        return {
          success: false,
          canceled: false,
          error: presentError.message,
        };
      }

      return { success: true };
    },
    [initPaymentSheet, presentPaymentSheet]
  );

  return { presentSheet };
}

/**
 * Fully native card payment confirmation — no Stripe-hosted UI.
 * Pair with <CardField> component rendered inside your own screen.
 */
export function useStripeCardConfirm() {
  const { confirmPayment, loading } = useConfirmPayment();

  const confirmCard = useCallback(
    async (clientSecret: string): Promise<PaymentSheetResult> => {
      const { paymentIntent, error } = await confirmPayment(clientSecret, {
        paymentMethodType: "Card",
      });

      if (error) {
        if ((error as { code?: string }).code === "Canceled") {
          return { success: false, canceled: true };
        }
        return { success: false, canceled: false, error: error.message };
      }

      const status = paymentIntent?.status;
      if (status === "Succeeded" || status === "Processing") {
        return { success: true };
      }

      return {
        success: false,
        canceled: false,
        error: "Pagamento não confirmado pelo servidor.",
      };
    },
    [confirmPayment]
  );

  return { confirmCard, loading };
}
