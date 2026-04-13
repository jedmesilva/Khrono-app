import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import * as Haptics from "expo-haptics";
import { supabase } from "@/lib/supabase";
import { useNotifications } from "@/context/NotificationsContext";

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
  status: "active" | "paused" | "ended" | "pending_signature" | "accepted";
  endedAt?: number;
  totalAmount?: number;
};

/**
 * Returns true only when a contract is actively running and accumulating
 * time and cost. A contract is running when:
 * - status is "active" (not pending, accepted, paused, or ended)
 * - it is not scheduled for a future start (agendado = false)
 * - it has a valid start timestamp (startedAt > 0)
 */
export function isContractRunning(contract: Contract): boolean {
  return (
    contract.status === "active" &&
    !contract.agendado &&
    contract.startedAt > 0
  );
}

type ContractsContextType = {
  activeContracts: Contract[];
  history: Contract[];
  isLoading: boolean;
  startContract: (contract: Omit<Contract, "id" | "status" | "startedAt"> & { serviceId?: string }, initialStatus?: "active" | "pending_signature") => Promise<string>;
  acceptContract: (id: string) => Promise<void>;
  beginContract: (id: string) => Promise<void>;
  cancelContract: (id: string) => Promise<void>;
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
    startedAt: c.started_at ? new Date(c.started_at).getTime() : 0,
    scheduledFor: c.scheduled_for ? new Date(c.scheduled_for).getTime() : undefined,
    status: c.status === "pending_signature" ? "pending_signature"
      : c.status === "accepted" ? "accepted"
      : c.status === "paused" ? "paused"
      : c.status === "active" ? "active"
      : "ended",
    endedAt: c.ended_at ? new Date(c.ended_at).getTime() : undefined,
    totalAmount: c.total_amount ? Number(c.total_amount) : undefined,
  };
}

const CONTRACT_SELECT = `
  *,
  contractor:profiles!contractor_id(id, name, first_name),
  hired:profiles!hired_id(id, name, first_name, provider_profiles(nota, avaliacoes, total_contracts)),
  service:provider_services!service_id(id, nome, nota, avaliacoes, valor_hora)
`;

export function ContractsProvider({ children }: { children: React.ReactNode }) {
  const { sendPushNotification } = useNotifications();
  const [activeContracts, setActiveContracts] = useState<Contract[]>([]);
  const [history, setHistory] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);
  const broadcastChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const broadcastReadyRef = useRef(false);
  const lastNewContractVibratedAt = useRef(0);

  const loadContracts = useCallback(async (userId: string, { showLoading = true }: { showLoading?: boolean } = {}) => {
    if (showLoading) setIsLoading(true);
    try {
      const [activeRes, historyRes] = await Promise.all([
        supabase
          .from("contracts")
          .select(CONTRACT_SELECT)
          .or(`contractor_id.eq.${userId},hired_id.eq.${userId}`)
          .in("status", ["active", "paused", "pending_signature", "accepted"])
          .order("created_at", { ascending: false }),
        supabase
          .from("contracts")
          .select(CONTRACT_SELECT)
          .or(`contractor_id.eq.${userId},hired_id.eq.${userId}`)
          .in("status", ["ended", "disputed", "cancelled"])
          .order("ended_at", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false })
          .limit(30),
      ]);

      if (activeRes.error) {
        console.warn("[ContractsContext] active contracts query error:", activeRes.error.message, activeRes.error.details);
      } else if (activeRes.data) {
        setActiveContracts(activeRes.data.map((c) => mapDbToContract(c, userId)));
      }
      if (historyRes.error) {
        console.warn("[ContractsContext] history contracts query error:", historyRes.error.message, historyRes.error.details);
      } else if (historyRes.data) {
        setHistory(historyRes.data.map((c) => mapDbToContract(c, userId)));
      }
    } catch (e) {
      console.warn("[ContractsContext] loadContracts error:", e);
    } finally {
      if (showLoading) setIsLoading(false);
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

      // Refetch silencioso: atualiza os contratos sem mostrar loading/skeleton
      const handleChange = async () => {
        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });
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
          async (payload: any) => {
            if (payload?.eventType === "INSERT") {
              const now = Date.now();
              if (now - lastNewContractVibratedAt.current > 2000) {
                lastNewContractVibratedAt.current = now;
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              }
            }
            await handleChange();
          }
        )
        .subscribe();

      // Broadcast channel: recebe notificações instantâneas quando um contrato
      // é criado para este usuário como contratado, sem depender de REPLICA IDENTITY.
      const broadcastCh = supabase
        .channel("khrono-contract-events")
        .on("broadcast", { event: "contract-created" }, async (msg) => {
          if (msg.payload?.hired_id === user.id) {
            // Vibra ao receber o broadcast (debounce de 2s para não vibrar duplo com o postgres_changes)
            const now = Date.now();
            if (now - lastNewContractVibratedAt.current > 2000) {
              lastNewContractVibratedAt.current = now;
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }
            await handleChange();
          }
        })
        .subscribe((s) => {
          broadcastReadyRef.current = s === "SUBSCRIBED";
        });
      broadcastChannelRef.current = broadcastCh;
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
      if (broadcastChannelRef.current) {
        broadcastReadyRef.current = false;
        supabase.removeChannel(broadcastChannelRef.current);
        broadcastChannelRef.current = null;
      }
    };
  }, [loadContracts]);

  const startContract = useCallback(
    async (contractData: Omit<Contract, "id" | "status" | "startedAt"> & { serviceId?: string }, initialStatus: "active" | "pending_signature" = "active"): Promise<string> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const serviceId = contractData.serviceId ?? contractData.servico?.serviceId ?? null;

      const { data: contract, error } = await supabase
        .from("contracts")
        .insert({
          contractor_id: user.id,
          hired_id: contractData.person.profileId ?? user.id,
          type: contractData.tipo === "cronometro" ? "open" : "defined",
          status: initialStatus,
          hourly_rate: contractData.ratePerHour,
          total_hours: contractData.duracaoTotal ? contractData.duracaoTotal / 3600000 : null,
          service_id: serviceId,
          payment_method: mapPaymentMethodToDb(contractData.paymentMethod),
          payment_card_label: contractData.paymentCardLabel ?? null,
          agendado: contractData.agendado ?? false,
          scheduled_for: contractData.scheduledFor
            ? new Date(contractData.scheduledFor).toISOString()
            : null,
          // Only record the start timestamp when the contract is immediately active.
          // pending_signature / accepted contracts get started_at = null here;
          // beginContract() writes the real timestamp when the hired party begins work.
          started_at: initialStatus === "active" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (error || !contract) {
        console.warn("[ContractsContext] insert error:", error?.message);
        throw new Error(error?.message ?? "Falha ao criar contrato");
      }

      const sideEffects: Promise<any>[] = [
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
      ];

      if (initialStatus === "active") {
        sideEffects.push(
          supabase.from("contract_time_entries").insert({
            contract_id: contract.id,
            event: "started",
            triggered_by: user.id,
          })
        );
      } else {
        sideEffects.push(
          supabase.from("contract_time_entries").insert({
            contract_id: contract.id,
            event: "created",
            triggered_by: user.id,
          })
        );
      }

      await Promise.all(sideEffects);

      if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });

      // Notifica em tempo real o prestador contratado via broadcast,
      // sem depender de REPLICA IDENTITY FULL no banco.
      const hiredId = contractData.person.profileId;
      if (hiredId && broadcastChannelRef.current && broadcastReadyRef.current) {
        broadcastChannelRef.current.send({
          type: "broadcast",
          event: "contract-created",
          payload: { hired_id: hiredId, contract_id: contract.id },
        });
      }

      // Push notification para o prestador contratado
      if (hiredId) {
        const providerName = contractData.person.name;
        const serviceName = contractData.servico?.nome ?? contractData.servico?.skill ?? "serviço";
        sendPushNotification(
          hiredId,
          "Nova contratação!",
          `Você foi contratado para ${serviceName}.`,
          { contract_id: contract.id },
          "contract_created"
        ).catch(() => {});
      }

      return contract.id;
    },
    [loadContracts, sendPushNotification]
  );

  const acceptContract = useCallback(
    async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error: updateError } = await supabase
        .from("contracts")
        .update({ status: "accepted" })
        .eq("id", id);

      if (updateError) {
        console.warn("[ContractsContext] acceptContract update error:", updateError.message, updateError.code);
        throw new Error(updateError.message);
      }

      const { error: entryError } = await supabase
        .from("contract_time_entries")
        .insert({ contract_id: id, event: "accepted", triggered_by: user.id });

      if (entryError) {
        console.warn("[ContractsContext] acceptContract entry error:", entryError.message);
      }

      if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });

      // Push notification para o contratante
      const { data: contractRow } = await supabase
        .from("contracts")
        .select("contractor_id")
        .eq("id", id)
        .single();
      if (contractRow?.contractor_id) {
        sendPushNotification(
          contractRow.contractor_id,
          "Contrato aceito!",
          "O prestador aceitou sua solicitação.",
          { contract_id: id },
          "contract_accepted"
        ).catch(() => {});
      }
    },
    [loadContracts, sendPushNotification]
  );

  const beginContract = useCallback(
    async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const startedAt = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("contracts")
        .update({ status: "active", started_at: startedAt })
        .eq("id", id);

      if (updateError) {
        console.warn("[ContractsContext] beginContract update error:", updateError.message, updateError.code);
        throw new Error(updateError.message);
      }

      const { error: entryError } = await supabase
        .from("contract_time_entries")
        .insert({ contract_id: id, event: "started", triggered_by: user.id });

      if (entryError) {
        console.warn("[ContractsContext] beginContract entry error:", entryError.message);
      }

      if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });

      // Notify the contractor that the provider has started working
      const { data: contractRow } = await supabase
        .from("contracts")
        .select("contractor_id")
        .eq("id", id)
        .single();
      if (contractRow?.contractor_id) {
        sendPushNotification(
          contractRow.contractor_id,
          "Serviço iniciado!",
          "O prestador começou a trabalhar no seu contrato.",
          { contract_id: id },
          "contract_started"
        ).catch(() => {});
      }
    },
    [loadContracts, sendPushNotification]
  );

  const cancelContract = useCallback(
    async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const contract = activeContracts.find((c) => c.id === id);

      try {
        await supabase
          .from("contracts")
          .update({ status: "cancelled", ended_at: new Date().toISOString() })
          .eq("id", id);
        await supabase.from("contract_time_entries").insert({
          contract_id: id,
          event: "cancelled",
          triggered_by: user.id,
        });
      } catch (e) {
        console.warn("[ContractsContext] cancelContract error:", e);
      }

      setActiveContracts((prev) => prev.filter((c) => c.id !== id));
      if (contract) {
        const cancelled: Contract = { ...contract, status: "ended", endedAt: Date.now(), totalAmount: contract.totalAmount ?? 0 };
        setHistory((h) => [cancelled, ...h]);

        // Notify the other party about the cancellation
        const otherPartyId = contract.person.profileId;
        if (otherPartyId) {
          const isHiring = contract.role === "hiring";
          sendPushNotification(
            otherPartyId,
            "Contrato cancelado",
            isHiring
              ? "O contratante cancelou o contrato."
              : "Você cancelou o contrato.",
            { contract_id: id },
            "contract_cancelled"
          ).catch(() => {});
        }
      }
    },
    [activeContracts, sendPushNotification]
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

        // Notify the other party that the contract ended
        const otherPartyId = contract.person.profileId;
        if (otherPartyId) {
          const isHiring = contract.role === "hiring";
          const amountLabel = `R$${totalAmount.toFixed(2)}`;
          sendPushNotification(
            otherPartyId,
            "Contrato encerrado",
            isHiring
              ? `O contrato foi encerrado. Valor: ${amountLabel}.`
              : `O contratante encerrou o serviço. Valor: ${amountLabel}.`,
            { contract_id: id },
            "contract_ended"
          ).catch(() => {});
        }
      });
    },
    [activeContracts, sendPushNotification]
  );

  return (
    <ContractsContext.Provider value={{ activeContracts, history, isLoading, startContract, acceptContract, beginContract, cancelContract, endContract }}>
      {children}
    </ContractsContext.Provider>
  );
}

export function useContracts() {
  const ctx = useContext(ContractsContext);
  if (!ctx) throw new Error("useContracts must be used inside ContractsProvider");
  return ctx;
}
