import React, { createContext, useContext, useState } from "react";

export type ProviderSkill = {
  id: number;
  nome: string;
  multiplicador: number;
  avaliacoes: number;
  nota: number;
};

export type ProviderTool = {
  id: number;
  nome: string;
  tipo: string;
  disponivel: boolean;
};

export type ProviderData = {
  name: string;
  initials: string;
  nota: number;
  avaliacoes: number;
  distancia: number;
  valorBase: number;
  skills: ProviderSkill[];
  tools: ProviderTool[];
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
