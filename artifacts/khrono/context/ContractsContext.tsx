import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Vibration } from "react-native";
import { supabase } from "@/lib/supabase";
import { useNotifications } from "@/context/NotificationsContext";
import { formatCurrency } from "@/lib/format";

export type ContractTool = {
  nome: string;
  tipo: string;
};

export type ContractStatus =
  | "active"
  | "paused"
  | "ended"
  | "pending_signature"
  | "accepted"
  | "pending_end"
  | "pending_cancel"
  | "rejected"
  | "cancelled";

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
  paymentStatus: "pending" | "paid" | "failed";
  agendado?: boolean;
  agendadoLabel?: string;
  tools?: ContractTool[];
  ratePerHour: number;
  startedAt: number;
  scheduledFor?: number;
  status: ContractStatus;
  endedAt?: number;
  totalAmount?: number;
  endReason?: string;
  cancelReason?: string;
  endRequestedBy?: string;
  cancelRequestedBy?: string;
  location?: string;
};

export function isContractRunning(contract: Contract): boolean {
  return (
    contract.status === "active" &&
    contract.startedAt > 0
  );
}

type ContractsContextType = {
  activeContracts: Contract[];
  history: Contract[];
  isLoading: boolean;
  startContract: (
    contract: Omit<Contract, "id" | "status" | "startedAt"> & { serviceId?: string },
    initialStatus?: "active" | "pending_signature"
  ) => Promise<string>;
  acceptContract: (id: string) => Promise<void>;
  rejectContract: (id: string) => Promise<void>;
  beginContract: (id: string) => Promise<void>;
  cancelContract: (id: string) => Promise<void>;
  requestEndContract: (id: string, reason: string) => Promise<void>;
  confirmEndContract: (id: string) => Promise<void>;
  requestCancelContract: (id: string, reason: string) => Promise<void>;
  confirmCancelContract: (id: string) => Promise<void>;
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

function mapPaymentMethodToUi(
  pm: string | null
): "cartao" | "pix" | "dinheiro" | "saldo" | undefined {
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

function mapDbStatusToUi(status: string): ContractStatus {
  const valid: ContractStatus[] = [
    "active", "paused", "ended", "pending_signature", "accepted",
    "pending_end", "pending_cancel", "rejected", "cancelled",
  ];
  return valid.includes(status as ContractStatus)
    ? (status as ContractStatus)
    : "ended";
}

function mapDbToContract(c: any, userId: string): Contract {
  const isHiring = c.contractor_id === userId;
  const role: "hiring" | "hired" = isHiring ? "hiring" : "hired";

  const otherParty = isHiring ? c.hired : c.contractor;
  const otherName = otherParty?.name || otherParty?.first_name || "Desconhecido";

  const providerProfiles = isHiring
    ? otherParty?.provider_profiles
    : undefined;
  const pp = Array.isArray(providerProfiles)
    ? providerProfiles[0]
    : providerProfiles;

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
    duracaoTotal: c.total_hours
      ? Number(c.total_hours) * 3600 * 1000
      : undefined,
    person: {
      name: otherName,
      initials: getInitials(otherName),
      skill: c.service?.skill ?? c.service?.nome ?? "",
      nota: pp?.nota ? Number(pp.nota) : undefined,
      avaliacoes: pp?.avaliacoes ?? undefined,
      distancia: c.distance_km != null ? Number(c.distance_km) : undefined,
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
    paymentStatus: (c.payment_status as "pending" | "paid" | "failed") ?? "pending",
    agendado: c.agendado ?? false,
    ratePerHour: Number(c.hourly_rate),
    startedAt: c.started_at ? new Date(c.started_at).getTime() : 0,
    scheduledFor: c.scheduled_for
      ? new Date(c.scheduled_for).getTime()
      : undefined,
    status: mapDbStatusToUi(c.status),
    endedAt: c.ended_at ? new Date(c.ended_at).getTime() : undefined,
    totalAmount: c.total_amount ? Number(c.total_amount) : undefined,
    endReason: c.end_reason ?? undefined,
    cancelReason: c.cancel_reason ?? undefined,
    endRequestedBy: c.end_requested_by ?? undefined,
    cancelRequestedBy: c.cancel_requested_by ?? undefined,
    location: c.location ?? undefined,
  };
}

const CONTRACT_SELECT = `
  *,
  contractor:profiles!contractor_id(id, name, first_name),
  hired:profiles!hired_id(id, name, first_name, provider_profiles(nota, avaliacoes, total_contracts)),
  service:provider_services!service_id(id, nome, nota, avaliacoes, valor_hora)
`;

const ACTIVE_STATUSES = [
  "active",
  "paused",
  "pending_signature",
  "accepted",
  "pending_end",
  "pending_cancel",
];

const HISTORY_STATUSES = ["ended", "disputed", "cancelled", "rejected"];

export function ContractsProvider({ children }: { children: React.ReactNode }) {
  const { sendPushNotification } = useNotifications();
  const [activeContracts, setActiveContracts] = useState<Contract[]>([]);
  const [history, setHistory] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);
  const broadcastChannelRef = useRef<ReturnType<
    typeof supabase.channel
  > | null>(null);
  const broadcastReadyRef = useRef(false);
  const lastNewContractVibratedAt = useRef(0);

  const loadContracts = useCallback(
    async (
      userId: string,
      { showLoading = true }: { showLoading?: boolean } = {}
    ) => {
      if (showLoading) setIsLoading(true);
      try {
        const [activeRes, historyRes] = await Promise.all([
          supabase
            .from("contracts")
            .select(CONTRACT_SELECT)
            .or(`contractor_id.eq.${userId},hired_id.eq.${userId}`)
            .in("status", ACTIVE_STATUSES)
            .order("created_at", { ascending: false }),
          supabase
            .from("contracts")
            .select(CONTRACT_SELECT)
            .or(`contractor_id.eq.${userId},hired_id.eq.${userId}`)
            .in("status", HISTORY_STATUSES)
            .order("ended_at", { ascending: false, nullsFirst: false })
            .order("created_at", { ascending: false })
            .limit(30),
        ]);

        if (activeRes.error) {
          console.warn(
            "[ContractsContext] active contracts query error:",
            activeRes.error.message
          );
        } else if (activeRes.data) {
          setActiveContracts(
            activeRes.data.map((c) => mapDbToContract(c, userId))
          );
        }
        if (historyRes.error) {
          console.warn(
            "[ContractsContext] history query error:",
            historyRes.error.message
          );
        } else if (historyRes.data) {
          setHistory(historyRes.data.map((c) => mapDbToContract(c, userId)));
        }
      } catch (e) {
        console.warn("[ContractsContext] loadContracts error:", e);
      } finally {
        if (showLoading) setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    let contractorChannel: ReturnType<typeof supabase.channel> | null = null;
    let hiredChannel: ReturnType<typeof supabase.channel> | null = null;

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        return;
      }
      userIdRef.current = user.id;
      await loadContracts(user.id);

      const handleChange = async () => {
        if (userIdRef.current)
          await loadContracts(userIdRef.current, { showLoading: false });
      };

      contractorChannel = supabase
        .channel("contracts-as-contractor")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "contracts",
            filter: `contractor_id=eq.${user.id}`,
          },
          handleChange
        )
        .subscribe();

      hiredChannel = supabase
        .channel("contracts-as-hired")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "contracts",
            filter: `hired_id=eq.${user.id}`,
          },
          async (payload: any) => {
            if (payload?.eventType === "INSERT") {
              const now = Date.now();
              if (now - lastNewContractVibratedAt.current > 2000) {
                lastNewContractVibratedAt.current = now;
                Vibration.vibrate([0, 700, 300, 700, 300, 700]);
              }
            }
            await handleChange();
          }
        )
        .subscribe();

      const broadcastCh = supabase
        .channel("khrono-contract-events")
        .on("broadcast", { event: "contract-created" }, async (msg) => {
          if (msg.payload?.hired_id === user.id) {
            const now = Date.now();
            if (now - lastNewContractVibratedAt.current > 2000) {
              lastNewContractVibratedAt.current = now;
              Vibration.vibrate([0, 700, 300, 700, 300, 700]);
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
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

  // ── Criar contrato ────────────────────────────────────────────────────────────

  const startContract = useCallback(
    async (
      contractData: Omit<Contract, "id" | "status" | "startedAt"> & {
        serviceId?: string;
      },
      initialStatus: "active" | "pending_signature" = "active"
    ): Promise<string> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const serviceId =
        contractData.serviceId ?? contractData.servico?.serviceId ?? null;

      const { data: contract, error } = await supabase
        .from("contracts")
        .insert({
          contractor_id: user.id,
          hired_id: contractData.person.profileId ?? user.id,
          type: contractData.tipo === "cronometro" ? "open" : "defined",
          status: initialStatus,
          hourly_rate: contractData.ratePerHour,
          total_hours: contractData.duracaoTotal
            ? contractData.duracaoTotal / 3600000
            : null,
          service_id: serviceId,
          payment_method: mapPaymentMethodToDb(contractData.paymentMethod),
          payment_card_label: contractData.paymentCardLabel ?? null,
          agendado: contractData.agendado ?? false,
          scheduled_for: contractData.scheduledFor
            ? new Date(contractData.scheduledFor).toISOString()
            : null,
          started_at:
            initialStatus === "active" ? new Date().toISOString() : null,
          location: contractData.location ?? null,
          distance_km: contractData.person.distancia ?? null,
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

      sideEffects.push(
        supabase.from("contract_time_entries").insert({
          contract_id: contract.id,
          event: initialStatus === "active" ? "started" : "created",
          triggered_by: user.id,
        })
      );

      await Promise.all(sideEffects);
      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const hiredId = contractData.person.profileId;

      if (hiredId && broadcastChannelRef.current && broadcastReadyRef.current) {
        broadcastChannelRef.current.send({
          type: "broadcast",
          event: "contract-created",
          payload: { hired_id: hiredId, contract_id: contract.id },
        });
      }

      const serviceName =
        contractData.servico?.nome ??
        contractData.servico?.skill ??
        "serviço";

      if (hiredId) {
        sendPushNotification(
          hiredId,
          "Nova contratação!",
          `Você foi contratado para ${serviceName}.`,
          { contract_id: contract.id },
          "contract_created"
        ).catch(() => {});
      }

      sendPushNotification(
        user.id,
        "Contrato criado",
        `Sua solicitação de ${serviceName} foi enviada.`,
        { contract_id: contract.id },
        "contract_created"
      ).catch(() => {});

      return contract.id;
    },
    [loadContracts, sendPushNotification]
  );

  // ── Aceitar contrato ──────────────────────────────────────────────────────────

  const acceptContract = useCallback(
    async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("contracts")
        .update({ status: "accepted" })
        .eq("id", id);

      if (error) throw new Error(error.message);

      await supabase.from("contract_time_entries").insert({
        contract_id: id,
        event: "accepted",
        triggered_by: user.id,
      });

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const { data: row } = await supabase
        .from("contracts")
        .select("contractor_id")
        .eq("id", id)
        .single();

      if (row?.contractor_id) {
        sendPushNotification(
          row.contractor_id,
          "Contrato aceito!",
          "O prestador aceitou sua solicitação.",
          { contract_id: id },
          "contract_accepted"
        ).catch(() => {});
      }

      sendPushNotification(
        user.id,
        "Contrato aceito",
        "Você aceitou o contrato. Aguarde o início.",
        { contract_id: id },
        "contract_accepted"
      ).catch(() => {});
    },
    [loadContracts, sendPushNotification]
  );

  // ── Recusar contrato ──────────────────────────────────────────────────────────

  const rejectContract = useCallback(
    async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("contracts")
        .update({ status: "rejected", ended_at: new Date().toISOString() })
        .eq("id", id);

      if (error) throw new Error(error.message);

      await supabase.from("contract_time_entries").insert({
        contract_id: id,
        event: "cancelled",
        triggered_by: user.id,
      });

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const { data: row } = await supabase
        .from("contracts")
        .select("contractor_id")
        .eq("id", id)
        .single();

      if (row?.contractor_id) {
        sendPushNotification(
          row.contractor_id,
          "Contrato recusado",
          "O prestador recusou sua solicitação de contrato.",
          { contract_id: id },
          "contract_cancelled"
        ).catch(() => {});
      }

      sendPushNotification(
        user.id,
        "Contrato recusado",
        "Você recusou esta solicitação de contrato.",
        { contract_id: id },
        "contract_cancelled"
      ).catch(() => {});
    },
    [loadContracts, sendPushNotification]
  );

  // ── Iniciar trabalho ──────────────────────────────────────────────────────────

  const beginContract = useCallback(
    async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const startedAt = new Date().toISOString();

      const { error } = await supabase
        .from("contracts")
        .update({ status: "active", started_at: startedAt, agendado: false })
        .eq("id", id);

      if (error) throw new Error(error.message);

      await supabase.from("contract_time_entries").insert({
        contract_id: id,
        event: "started",
        triggered_by: user.id,
      });

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const { data: row } = await supabase
        .from("contracts")
        .select("contractor_id")
        .eq("id", id)
        .single();

      if (row?.contractor_id) {
        sendPushNotification(
          row.contractor_id,
          "Serviço iniciado!",
          "O prestador começou a trabalhar no seu contrato.",
          { contract_id: id },
          "contract_started"
        ).catch(() => {});
      }

      sendPushNotification(
        user.id,
        "Serviço iniciado",
        "Você iniciou o trabalho. Bom serviço!",
        { contract_id: id },
        "contract_started"
      ).catch(() => {});
    },
    [loadContracts, sendPushNotification]
  );

  // ── Cancelamento direto (antes de iniciar) ────────────────────────────────────

  const cancelContract = useCallback(
    async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const contract = activeContracts.find((c) => c.id === id);

      await supabase
        .from("contracts")
        .update({ status: "cancelled", ended_at: new Date().toISOString() })
        .eq("id", id);

      await supabase.from("contract_time_entries").insert({
        contract_id: id,
        event: "cancelled",
        triggered_by: user.id,
      });

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const otherPartyId = contract?.person.profileId;
      const isHiring = contract?.role === "hiring";

      if (otherPartyId) {
        sendPushNotification(
          otherPartyId,
          "Contrato cancelado",
          isHiring
            ? "O contratante cancelou o contrato."
            : "O prestador cancelou o contrato.",
          { contract_id: id },
          "contract_cancelled"
        ).catch(() => {});
      }

      sendPushNotification(
        user.id,
        "Contrato cancelado",
        "Você cancelou o contrato.",
        { contract_id: id },
        "contract_cancelled"
      ).catch(() => {});
    },
    [activeContracts, loadContracts, sendPushNotification]
  );

  // ── Solicitar encerramento ────────────────────────────────────────────────────

  const requestEndContract = useCallback(
    async (id: string, reason: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("contracts")
        .update({
          status: "pending_end",
          end_requested_by: user.id,
          end_reason: reason,
        })
        .eq("id", id);

      if (error) throw new Error(error.message);

      await supabase.from("contract_time_entries").insert({
        contract_id: id,
        event: "ended",
        triggered_by: user.id,
      });

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const contract = activeContracts.find((c) => c.id === id);
      const otherPartyId = contract?.person.profileId;
      const isHiring = contract?.role === "hiring";

      if (otherPartyId) {
        sendPushNotification(
          otherPartyId,
          "Solicitação de encerramento",
          `${isHiring ? "O contratante" : "O prestador"} solicitou encerrar o contrato. Motivo: ${reason}`,
          { contract_id: id },
          "contract_ended"
        ).catch(() => {});
      }

      sendPushNotification(
        user.id,
        "Encerramento solicitado",
        `Sua solicitação de encerramento foi enviada. Aguardando confirmação da contraparte.`,
        { contract_id: id },
        "contract_ended"
      ).catch(() => {});
    },
    [activeContracts, loadContracts, sendPushNotification]
  );

  // ── Confirmar encerramento ────────────────────────────────────────────────────

  const confirmEndContract = useCallback(
    async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const contract = activeContracts.find((c) => c.id === id);
      if (!contract) throw new Error("Contrato não encontrado");

      const endedAt = Date.now();
      const duration = (endedAt - contract.startedAt) / 1000 / 3600;
      const totalAmount =
        contract.tipo === "timer" && contract.duracaoTotal
          ? parseFloat(
              (
                (contract.duracaoTotal / 1000 / 3600) *
                contract.ratePerHour
              ).toFixed(2)
            )
          : parseFloat((duration * contract.ratePerHour).toFixed(2));

      const { error } = await supabase
        .from("contracts")
        .update({
          status: "ended",
          ended_at: new Date(endedAt).toISOString(),
          total_amount: totalAmount,
          payment_status: contract.paymentMethod !== "dinheiro" ? "paid" : "pending",
        })
        .eq("id", id);

      if (error) throw new Error(error.message);

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const otherPartyId = contract.person.profileId;
      const amountLabel = formatCurrency(totalAmount);
      const reason = contract.endReason ?? "Encerrado com acordo mútuo";

      if (otherPartyId) {
        sendPushNotification(
          otherPartyId,
          "Contrato encerrado",
          `Contrato encerrado. Motivo: ${reason}. Valor: ${amountLabel}.`,
          { contract_id: id },
          "contract_ended"
        ).catch(() => {});
      }

      sendPushNotification(
        user.id,
        "Contrato encerrado",
        `Você confirmou o encerramento. Valor: ${amountLabel}.`,
        { contract_id: id },
        "contract_ended"
      ).catch(() => {});
    },
    [activeContracts, loadContracts, sendPushNotification]
  );

  // ── Solicitar cancelamento (após iniciado) ────────────────────────────────────

  const requestCancelContract = useCallback(
    async (id: string, reason: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("contracts")
        .update({
          status: "pending_cancel",
          cancel_requested_by: user.id,
          cancel_reason: reason,
        })
        .eq("id", id);

      if (error) throw new Error(error.message);

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const contract = activeContracts.find((c) => c.id === id);
      const otherPartyId = contract?.person.profileId;
      const isHiring = contract?.role === "hiring";

      if (otherPartyId) {
        sendPushNotification(
          otherPartyId,
          "Solicitação de cancelamento",
          `${isHiring ? "O contratante" : "O prestador"} quer cancelar o contrato. Motivo: ${reason}`,
          { contract_id: id },
          "contract_cancelled"
        ).catch(() => {});
      }

      sendPushNotification(
        user.id,
        "Cancelamento solicitado",
        "Sua solicitação de cancelamento foi enviada. Aguardando confirmação.",
        { contract_id: id },
        "contract_cancelled"
      ).catch(() => {});
    },
    [activeContracts, loadContracts, sendPushNotification]
  );

  // ── Confirmar cancelamento ────────────────────────────────────────────────────

  const confirmCancelContract = useCallback(
    async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const contract = activeContracts.find((c) => c.id === id);

      const { error } = await supabase
        .from("contracts")
        .update({
          status: "cancelled",
          ended_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw new Error(error.message);

      await supabase.from("contract_time_entries").insert({
        contract_id: id,
        event: "cancelled",
        triggered_by: user.id,
      });

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const otherPartyId = contract?.person.profileId;
      const reason = contract?.cancelReason ?? "Cancelado com acordo mútuo";

      if (otherPartyId) {
        sendPushNotification(
          otherPartyId,
          "Contrato cancelado",
          `Contrato cancelado. Motivo: ${reason}.`,
          { contract_id: id },
          "contract_cancelled"
        ).catch(() => {});
      }

      sendPushNotification(
        user.id,
        "Contrato cancelado",
        "Você confirmou o cancelamento do contrato.",
        { contract_id: id },
        "contract_cancelled"
      ).catch(() => {});
    },
    [activeContracts, loadContracts, sendPushNotification]
  );

  return (
    <ContractsContext.Provider
      value={{
        activeContracts,
        history,
        isLoading,
        startContract,
        acceptContract,
        rejectContract,
        beginContract,
        cancelContract,
        requestEndContract,
        confirmEndContract,
        requestCancelContract,
        confirmCancelContract,
      }}
    >
      {children}
    </ContractsContext.Provider>
  );
}

export function useContracts() {
  const ctx = useContext(ContractsContext);
  if (!ctx)
    throw new Error("useContracts must be used inside ContractsProvider");
  return ctx;
}
