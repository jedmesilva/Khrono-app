import React from "react";

export function StripeProvider({ children }: { children: React.ReactNode; publishableKey?: string; urlScheme?: string; merchantIdentifier?: string; [key: string]: unknown }) {
  return <>{children}</>;
}
