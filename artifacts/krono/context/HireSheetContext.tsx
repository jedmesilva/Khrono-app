import React, { createContext, useContext, useState } from "react";

type HireSheetContextType = {
  isOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
};

const HireSheetContext = createContext<HireSheetContextType>({
  isOpen: false,
  openSheet: () => {},
  closeSheet: () => {},
});

export function HireSheetProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <HireSheetContext.Provider
      value={{
        isOpen,
        openSheet: () => setIsOpen(true),
        closeSheet: () => setIsOpen(false),
      }}
    >
      {children}
    </HireSheetContext.Provider>
  );
}

export const useHireSheet = () => useContext(HireSheetContext);
