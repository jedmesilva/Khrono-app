import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

export type ContractTool = {
  nome: string;
  tipo: string;
};

export type Contract = {
  id: string;
  code?: string;
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
    serviceId?: string;
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
  isLoading: boolean;
  startContract: (contract: Omit<Contract, "id" | "status" | "startedAt"> & { serviceId?: string }) => Promise<string>;
  endContract: (id: string) => void;
};

const ContractsContext = createContext<ContractsContextType | null>(null);

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function mapPaymentMethodToUi(pm: string | null): "cartao" | "pix" | "dinheiro" | "saldo" | undefined {
  if (!pm) return undefined;
  const map: Record<string, "cartao" | "pix" | "dinheiro" | "saldo"> = {
    card: "cartao",
    pix: "pix",
    cash: "dinheiro",
    balance: "saldo",
  };
  return map[pm];
}

function mapPaymentMethodToDb(pm: string | undefined | null): string | null {
  if (!pm) return null;
  const map: Record<string, string> = {
    cartao: "card",
    pix: "pix",
    dinheiro: "cash",
    saldo: "balance",
  };
  return map[pm] ?? null;
}

function mapDbToContract(c: any, userId: string): Contract {
  const isHiring = c.contractor_id === userId;
  const role: "hiring" | "hired" = isHiring ? "hiring" : "hired";

  const otherParty = isHiring ? c.hired : c.contractor;
  const otherName = otherParty?.name || otherParty?.first_name || "Desconhecido";

  const providerProfiles = isHiring
    ? otherParty?.provider_profiles
    : undefined;
  const pp = Array.isArray(providerProfiles) ? providerProfiles[0] : providerProfiles;

  const tools = c.service?.tools;
  const toolsList: string[] = Array.isArray(tools)
    ? tools
    : typeof tools === "object" && tools !== null
    ? Object.values(tools)
    : [];

  return {
    id: c.id,
    code: c.code,
    role,
    tipo: c.type === "open" ? "cronometro" : "timer",
    duracaoTotal: c.total_hours ? Number(c.total_hours) * 3600 * 1000 : undefined,
    person: {
      name: otherName,
      initials: getInitials(otherName),
      skill: c.service?.skill ?? c.service?.nome ?? "",
      nota: pp?.nota ? Number(pp.nota) : undefined,
      avaliacoes: pp?.avaliacoes ?? undefined,
      distancia: 1.5,
      profileId: isHiring ? c.hired_id : c.contractor_id,
      totalContracts: pp?.total_contracts ?? undefined,
      totalServices: 1,
    },
    servico: c.service
      ? {
          nome: c.service.nome,
          nota: c.service.nota ? Number(c.service.nota) : undefined,
          avaliacoes: c.service.avaliacoes ?? undefined,
          ratePerHour: Number(c.hourly_rate),
          skill: c.service.skill ?? undefined,
          tools: toolsList,
          serviceId: c.service.id,
        }
      : undefined,
    paymentMethod: mapPaymentMethodToUi(c.payment_method),
    paymentCardLabel: c.payment_card_label ?? undefined,
    agendado: c.agendado ?? false,
    ratePerHour: Number(c.hourly_rate),
    startedAt: new Date(c.started_at).getTime(),
    scheduledFor: c.scheduled_for ? new Date(c.scheduled_for).getTime() : undefined,
    status: c.status === "active" || c.status === "paused" ? "active" : "ended",
    endedAt: c.ended_at ? new Date(c.ended_at).getTime() : undefined,
    totalAmount: c.total_amount ? Number(c.total_amount) : undefined,
  };
}

const CONTRACT_SELECT = `
  *,
  contractor:profiles!contracts_contractor_id_fkey(id, name, first_name),
  hired:profiles!contracts_hired_id_fkey(id, name, first_name, provider_profiles(nota, avaliacoes, total_contracts)),
  service:provider_services!contracts_service_id_fkey(id, nome, nota, avaliacoes, skill, tools, multiplicador)
`;

export function ContractsProvider({ children }: { children: React.ReactNode }) {
  const [activeContracts, setActiveContracts] = useState<Contract[]>([]);
  const [history, setHistory] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const loadContracts = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const [activeRes, historyRes] = await Promise.all([
        supabase
          .from("contracts")
          .select(CONTRACT_SELECT)
          .or(`contractor_id.eq.${userId},hired_id.eq.${userId}`)
          .in("status", ["active", "paused", "pending_signature"])
          .order("started_at", { ascending: false }),
        supabase
          .from("contracts")
          .select(CONTRACT_SELECT)
          .or(`contractor_id.eq.${userId},hired_id.eq.${userId}`)
          .in("status", ["ended", "disputed", "cancelled"])
          .order("ended_at", { ascending: false })
          .limit(30),
      ]);

      if (!activeRes.error && activeRes.data) {
        setActiveContracts(activeRes.data.map((c) => mapDbToContract(c, userId)));
      }
      if (!historyRes.error && historyRes.data) {
        setHistory(historyRes.data.map((c) => mapDbToContract(c, userId)));
      }
    } catch (e) {
      console.warn("[ContractsContext] loadContracts error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let contractorChannel: ReturnType<typeof supabase.channel> | null = null;
    let hiredChannel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsLoading(false); return; }
      userIdRef.current = user.id;
      await loadContracts(user.id);

      const handleChange = async () => {
        if (userIdRef.current) await loadContracts(userIdRef.current);
      };

      contractorChannel = supabase
        .channel("contracts-as-contractor")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "contracts", filter: `contractor_id=eq.${user.id}` },
          handleChange
        )
        .subscribe();

      hiredChannel = supabase
        .channel("contracts-as-hired")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "contracts", filter: `hired_id=eq.${user.id}` },
          handleChange
        )
        .subscribe();
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        userIdRef.current = session.user.id;
        loadContracts(session.user.id);
      } else {
        userIdRef.current = null;
        setActiveContracts([]);
        setHistory([]);
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (contractorChannel) supabase.removeChannel(contractorChannel);
      if (hiredChannel) supabase.removeChannel(hiredChannel);
    };
  }, [loadContracts]);

  const startContract = useCallback(
    async (contractData: Omit<Contract, "id" | "status" | "startedAt"> & { serviceId?: string }): Promise<string> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const startedAt = new Date().toISOString();
      const serviceId = contractData.serviceId ?? contractData.servico?.serviceId ?? null;

      const { data: contract, error } = await supabase
        .from("contracts")
        .insert({
          contractor_id: user.id,
          hired_id: contractData.person.profileId ?? user.id,
          type: contractData.tipo === "cronometro" ? "open" : "defined",
          status: "active",
          hourly_rate: contractData.ratePerHour,
          total_hours: contractData.duracaoTotal ? contractData.duracaoTotal / 3600000 : null,
          service_id: serviceId,
          payment_method: mapPaymentMethodToDb(contractData.paymentMethod),
          payment_card_label: contractData.paymentCardLabel ?? null,
          agendado: contractData.agendado ?? false,
          scheduled_for: contractData.scheduledFor
            ? new Date(contractData.scheduledFor).toISOString()
            : null,
          started_at: startedAt,
        })
        .select()
        .single();

      if (error || !contract) {
        console.warn("[ContractsContext] insert error:", error?.message);
        throw new Error(error?.message ?? "Falha ao criar contrato");
      }

      await Promise.all([
        supabase.from("contract_parties").insert({
          contract_id: contract.id,
          role: "contractor",
          user_id: user.id,
          name: user.user_metadata?.name ?? user.email ?? "Contratante",
        }),
        supabase.from("contract_parties").insert({
          contract_id: contract.id,
          role: "hired",
          user_id: contractData.person.profileId ?? null,
          name: contractData.person.name,
        }),
        supabase.from("contract_time_entries").insert({
          contract_id: contract.id,
          event: "started",
          triggered_by: user.id,
        }),
      ]);

      if (userIdRef.current) await loadContracts(userIdRef.current);

      return contract.id;
    },
    [loadContracts]
  );

  const endContract = useCallback(
    (id: string) => {
      const contract = activeContracts.find((c) => c.id === id);
      if (!contract) return;

      const endedAt = Date.now();
      const duration = (endedAt - contract.startedAt) / 1000 / 3600;
      const totalAmount =
        contract.tipo === "timer" && contract.duracaoTotal
          ? parseFloat(((contract.duracaoTotal / 1000 / 3600) * contract.ratePerHour).toFixed(2))
          : parseFloat((duration * contract.ratePerHour).toFixed(2));

      const ended: Contract = { ...contract, status: "ended", endedAt, totalAmount };
      setActiveContracts((prev) => prev.filter((c) => c.id !== id));
      setHistory((h) => [ended, ...h]);

      supabase.auth.getUser().then(({ data: { user } }) => {
        if (!user) return;
        Promise.all([
          supabase
            .from("contracts")
            .update({
              status: "ended",
              ended_at: new Date(endedAt).toISOString(),
              total_amount: totalAmount,
            })
            .eq("id", id),
          supabase.from("contract_time_entries").insert({
            contract_id: id,
            event: "ended",
            triggered_by: user.id,
          }),
        ]).catch((e) => console.warn("[ContractsContext] endContract error:", e));
      });
    },
    [activeContracts]
  );

  return (
    <ContractsContext.Provider value={{ activeContracts, history, isLoading, startContract, endContract }}>
      {children}
    </ContractsContext.Provider>
  );
}

export function useContracts() {
  const ctx = useContext(ContractsContext);
  if (!ctx) throw new Error("useContracts must be used inside ContractsProvider");
  return ctx;
}
