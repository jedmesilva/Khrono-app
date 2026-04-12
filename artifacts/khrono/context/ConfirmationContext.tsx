import React, { createContext, useContext, useState } from "react";

export type ProviderService = {
  id: number;
  serviceId: string;
  nome: string;
  hourlyRate: number;
  avaliacoes: number;
  nota: number;
  skill?: string;
  tools?: string[];
};

export type ProviderData = {
  name: string;
  initials: string;
  nota: number;
  avaliacoes: number;
  distancia: number;
  totalContracts?: number;
  services: ProviderService[];
  profileId?: string;
  verified?: boolean;
};

type ConfirmationContextType = {
  pendingProvider: ProviderData | null;
  setPendingProvider: (p: ProviderData | null) => void;
};

const ConfirmationContext = createContext<ConfirmationContextType>({
  pendingProvider: null,
  setPendingProvider: () => {},
});

export function ConfirmationProvider({ children }: { children: React.ReactNode }) {
  const [pendingProvider, setPendingProvider] = useState<ProviderData | null>(null);
  return (
    <ConfirmationContext.Provider value={{ pendingProvider, setPendingProvider }}>
      {children}
    </ConfirmationContext.Provider>
  );
}

export const useConfirmation = () => useContext(ConfirmationContext);
