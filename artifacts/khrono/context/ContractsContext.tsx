import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export type ContractTool = {
  nome: string;
  tipo: string;
};

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
    profileId?: string;
    totalContracts?: number;
    totalServices?: number;
  };
  servico?: {
    nome: string;
    nota?: number;
    avaliacoes?: number;
    ratePerHour: number;
    skill?: string;
    tools?: string[];
  };
  paymentMethod?: "cartao" | "pix" | "dinheiro" | "saldo";
  paymentCardLabel?: string;
  agendado?: boolean;
  agendadoLabel?: string;
  tools?: ContractTool[];
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

const STORAGE_KEY = "khrono_contracts_v2";

const INITIAL_ACTIVE: Contract[] = [
  {
    id: "1",
    role: "hiring",
    tipo: "cronometro",
    person: { name: "Felipe Andrade", initials: "FA", skill: "Montador de Móveis", nota: 4.8, avaliacoes: 34, distancia: 1.2, totalContracts: 31, totalServices: 2 },
    servico: { nome: "Montagem de Móveis", nota: 4.8, avaliacoes: 34, ratePerHour: 60, skill: "Montador de Móveis", tools: ["Honda Civic 2019", "Kit Furadeira Bosch"] },
    paymentMethod: "cartao",
    paymentCardLabel: "Mastercard •••• 4291",
    agendado: false,
    ratePerHour: 60,
    startedAt: Date.now() - 1000 * 60 * 47,
    status: "active",
  },
  {
    id: "2",
    role: "hired",
    tipo: "timer",
    duracaoTotal: 1000 * 60 * 60,
    person: { name: "Bruno Souza", initials: "BS", skill: "Consultoria de Redes Sociais", nota: 4.6, avaliacoes: 21, distancia: 2.5, totalContracts: 18, totalServices: 3 },
    servico: { nome: "Consultoria de Redes Sociais", nota: 4.6, avaliacoes: 21, ratePerHour: 50, skill: "Consultor Digital" },
    paymentMethod: "pix",
    agendado: false,
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
    person: { name: "Rafael Lima", initials: "RL", skill: "Eletricista", nota: 4.9, avaliacoes: 58, distancia: 0.8, totalContracts: 34, totalServices: 2 },
    servico: { nome: "Instalação Elétrica", nota: 4.9, avaliacoes: 58, ratePerHour: 60, skill: "Eletricista", tools: ["Alicate Amperímetro", "Kit Cabos"] },
    paymentMethod: "dinheiro",
    agendado: false,
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
    person: { name: "Ana Pereira", initials: "AP", skill: "Cuidadora de Crianças", nota: 4.7, avaliacoes: 12, distancia: 3.1, totalContracts: 25, totalServices: 1 },
    servico: { nome: "Cuidado de Crianças", nota: 4.7, avaliacoes: 12, ratePerHour: 50, skill: "Cuidadora" },
    paymentMethod: "cartao",
    paymentCardLabel: "Visa •••• 8823",
    agendado: true,
    agendadoLabel: "Amanhã às 09:00",
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
    person: { name: "Mariana Costa", initials: "MC", skill: "Encanadora", nota: 4.5, avaliacoes: 27, distancia: 1.9, totalContracts: 22, totalServices: 2 },
    servico: { nome: "Reparo Hidráulico", nota: 4.5, avaliacoes: 27, ratePerHour: 80, skill: "Encanadora", tools: ["Kit Hidráulico"] },
    paymentMethod: "pix",
    agendado: false,
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
      const id = generateUUID();
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

      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        supabase.from("contracts").insert({
          id,
          hiring_user_id: user.id,
          hired_user_id: contract.person.profileId ?? user.id,
          tipo: contract.tipo,
          status: "active",
          rate_per_hour: contract.ratePerHour,
          duracao_total: contract.duracaoTotal ?? null,
          service_name: contract.servico?.nome ?? null,
          payment_method: contract.paymentMethod ?? null,
          payment_card_label: contract.paymentCardLabel ?? null,
          agendado: contract.agendado ?? false,
          scheduled_for: contract.scheduledFor ? new Date(contract.scheduledFor).toISOString() : null,
          started_at: new Date(Date.now()).toISOString(),
        }).then(({ error }) => {
          if (error) console.warn("[ContractsContext] Supabase insert error:", error.message);
        });
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

        supabase.from("contracts").update({
          status: "ended",
          ended_at: new Date(endedAt).toISOString(),
          total_amount: totalAmount,
          updated_at: new Date().toISOString(),
        }).eq("id", id).then(({ error }) => {
          if (error) console.warn("[ContractsContext] Supabase update error:", error.message);
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
