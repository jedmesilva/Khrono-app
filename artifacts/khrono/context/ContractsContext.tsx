import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Contract = {
  id: string;
  role: "hired" | "hiring";
  tipo: "cronometro" | "timer";
  duracaoTotal?: number;
  person: {
    name: string;
    initials: string;
    skill: string;
    pinCode?: string;
    nota?: number;
    avaliacoes?: number;
    distancia?: number;
  };
  ratePerHour: number;
  startedAt: number;
  scheduledFor?: number;
  status: "active" | "ended";
  endedAt?: number;
  totalAmount?: number;
};

type ContractsContextType = {
  activeContracts: Contract[];
  history: Contract[];
  startContract: (contract: Omit<Contract, "id" | "status" | "startedAt">) => string;
  endContract: (id: string) => void;
};

const ContractsContext = createContext<ContractsContextType | null>(null);

const STORAGE_KEY = "khrono_contracts";

const INITIAL_ACTIVE: Contract[] = [
  {
    id: "1",
    role: "hiring",
    tipo: "cronometro",
    person: { name: "Felipe Andrade", initials: "FA", skill: "Montador de Móveis" },
    ratePerHour: 60,
    startedAt: Date.now() - 1000 * 60 * 47,
    status: "active",
  },
  {
    id: "2",
    role: "hired",
    tipo: "timer",
    duracaoTotal: 1000 * 60 * 60,
    person: { name: "Bruno Souza", initials: "BS", skill: "Consultoria de Redes Sociais" },
    ratePerHour: 50,
    startedAt: Date.now() - 1000 * 60 * 23,
    status: "active",
  },
];

const INITIAL_HISTORY: Contract[] = [
  {
    id: "h1",
    role: "hiring",
    tipo: "cronometro",
    person: { name: "Rafael Lima", initials: "RL", skill: "Eletricista" },
    ratePerHour: 60,
    startedAt: Date.now() - 1000 * 60 * 60 * 3,
    status: "ended",
    endedAt: Date.now() - 1000 * 60 * 60,
    totalAmount: 120,
  },
  {
    id: "h2",
    role: "hired",
    tipo: "timer",
    duracaoTotal: 1000 * 60 * 90,
    person: { name: "Ana Pereira", initials: "AP", skill: "Cuidadora de Crianças" },
    ratePerHour: 50,
    startedAt: Date.now() - 1000 * 60 * 60 * 4,
    status: "ended",
    endedAt: Date.now() - 1000 * 60 * 60 * 2.5,
    totalAmount: 75,
  },
  {
    id: "h3",
    role: "hiring",
    tipo: "cronometro",
    person: { name: "Mariana Costa", initials: "MC", skill: "Encanadora" },
    ratePerHour: 80,
    startedAt: Date.now() - 1000 * 60 * 60 * 24,
    status: "ended",
    endedAt: Date.now() - 1000 * 60 * 60 * 22,
    totalAmount: 160,
  },
];

export function ContractsProvider({ children }: { children: React.ReactNode }) {
  const [activeContracts, setActiveContracts] = useState<Contract[]>(INITIAL_ACTIVE);
  const [history, setHistory] = useState<Contract[]>(INITIAL_HISTORY);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.active?.length > 0) setActiveContracts(parsed.active);
        if (parsed.history?.length > 0) setHistory(parsed.history);
      }
    } catch (e) {}
  };

  const saveData = useCallback(
    async (active: Contract[], hist: Contract[]) => {
      try {
        await AsyncStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ active, history: hist })
        );
      } catch (e) {}
    },
    []
  );

  const startContract = useCallback(
    (contract: Omit<Contract, "id" | "status" | "startedAt">): string => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
      const newContract: Contract = {
        ...contract,
        id,
        status: "active",
        startedAt: Date.now(),
      };
      setActiveContracts((prev) => {
        const updated = [newContract, ...prev];
        saveData(updated, history);
        return updated;
      });
      return id;
    },
    [history, saveData]
  );

  const endContract = useCallback(
    (id: string) => {
      setActiveContracts((prev) => {
        const contract = prev.find((c) => c.id === id);
        if (!contract) return prev;
        const endedAt = Date.now();
        const duration = (endedAt - contract.startedAt) / 1000 / 3600;
        const totalAmount =
          contract.tipo === "timer" && contract.duracaoTotal
            ? parseFloat(((contract.duracaoTotal / 1000 / 3600) * contract.ratePerHour).toFixed(2))
            : parseFloat((duration * contract.ratePerHour).toFixed(2));
        const ended: Contract = { ...contract, status: "ended", endedAt, totalAmount };
        const updatedActive = prev.filter((c) => c.id !== id);
        setHistory((h) => {
          const updatedHistory = [ended, ...h];
          saveData(updatedActive, updatedHistory);
          return updatedHistory;
        });
        return updatedActive;
      });
    },
    [saveData]
  );

  return (
    <ContractsContext.Provider value={{ activeContracts, history, startContract, endContract }}>
      {children}
    </ContractsContext.Provider>
  );
}

export function useContracts() {
  const ctx = useContext(ContractsContext);
  if (!ctx) throw new Error("useContracts must be used inside ContractsProvider");
  return ctx;
}
