import React, { createContext, useCallback, useContext, useState } from "react";

import { MY_PROFILE } from "@/constants/profile-data";

interface ServicesContextType {
  activeStates: Record<string, boolean>;
  isActive: (id: string) => boolean;
  toggleActive: (id: string) => void;
}

const ServicesContext = createContext<ServicesContextType | null>(null);

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const [activeStates, setActiveStates] = useState<Record<string, boolean>>(
    () => Object.fromEntries(MY_PROFILE.services.map((s) => [s.id, s.active]))
  );

  const isActive = useCallback(
    (id: string) => activeStates[id] ?? true,
    [activeStates]
  );

  const toggleActive = useCallback((id: string) => {
    setActiveStates((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  return (
    <ServicesContext.Provider value={{ activeStates, isActive, toggleActive }}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices() {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error("useServices must be used within ServicesProvider");
  return ctx;
}
