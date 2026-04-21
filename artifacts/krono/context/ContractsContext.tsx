import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as ExpoLocation from "expo-location";
import { AppState, AppStateStatus, Platform, Vibration } from "react-native";
import { supabase } from "@/lib/supabase";
import { useNotifications } from "@/context/NotificationsContext";
import { formatCurrency } from "@/lib/format";
import { createStripePaymentIntent } from "@/lib/stripeApi";

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
  | "cancelled"
  | "disputed";

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
  paymentStatus: "pending" | "awaiting_confirmation" | "paid" | "failed" | "disputed";
  billingTrigger: "on_end" | "on_start" | "split";
  pendingExtraAmount?: number;
  pendingRefundAmount?: number;
  agendado?: boolean;
  agendadoLabel?: string;
  tools?: ContractTool[];
  ratePerHour: number;
  startedAt: number;
  scheduledFor?: number;
  createdAt: number;
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
  ) => Promise<{ id: string; clientSecret?: string }>;
  /** Creates a draft contract (invisible to hired party). Must be followed by processPaymentForDraftContract + finalizeContract. */
  createDraftContract: (
    contract: Omit<Contract, "id" | "status" | "startedAt" | "paymentStatus" | "billingTrigger" | "createdAt" | "endedAt" | "totalAmount" | "endReason" | "cancelReason" | "endRequestedBy" | "cancelRequestedBy" | "pendingExtraAmount" | "pendingRefundAmount"> & { serviceId?: string }
  ) => Promise<{ id: string }>;
  /** Processes payment for a draft contract (creates contract_payments record). For card, returns clientSecret. */
  processPaymentForDraftContract: (
    contractId: string,
    params: { method: string; amount: number; pixPaymentIntentId?: string }
  ) => Promise<{ clientSecret?: string }>;
  /** Moves draft → pending_signature and creates contract_deliveries record to notify hired party. */
  finalizeContract: (contractId: string) => Promise<void>;
  /** Deletes a draft contract (user cancelled before finalizing). */
  deleteDraftContract: (contractId: string) => Promise<void>;
  /** Marks a contract delivery as seen (called when hired party opens contract detail). */
  markDeliveryAsSeen: (contractId: string) => Promise<void>;
  acceptContract: (id: string) => Promise<void>;
  rejectContract: (id: string) => Promise<void>;
  beginContract: (id: string) => Promise<void>;
  cancelContract: (id: string) => Promise<void>;
  requestEndContract: (id: string, reason: string) => Promise<void>;
  confirmEndContract: (id: string) => Promise<{ clientSecret?: string }>;
  rejectEndRequest: (id: string) => Promise<void>;
  requestCancelContract: (id: string, reason: string) => Promise<void>;
  confirmCancelContract: (id: string) => Promise<void>;
  rejectCancelRequest: (id: string) => Promise<void>;
  confirmCashPayment: (id: string) => Promise<void>;
  reportCashPaid: (id: string, amountReported: number) => Promise<void>;
  reportCashReceived: (id: string, amountReceived: number, isIncomplete: boolean) => Promise<void>;
  changeContractPaymentMethod: (id: string, newMethod: "cartao" | "pix" | "saldo" | "dinheiro", cardLabel?: string) => Promise<void>;
  disputeCashPayment: (id: string, reason?: string) => Promise<void>;
  payPendingBalance: (contractId: string) => Promise<void>;
  refreshContracts: () => Promise<void>;
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
    "pending_end", "pending_cancel", "rejected", "cancelled", "disputed",
  ];
  return valid.includes(status as ContractStatus)
    ? (status as ContractStatus)
    : "ended";
}

function getPendingActionRequest(c: any, type: "end" | "cancel") {
  const requests = Array.isArray(c.action_requests) ? c.action_requests : [];
  return requests
    .filter((request: any) => request.type === type && request.status === "pending")
    .sort(
      (a: any, b: any) =>
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
    )[0];
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
  const pendingEnd = getPendingActionRequest(c, "end");
  const pendingCancel = getPendingActionRequest(c, "cancel");

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
    paymentStatus: (c.payment_status as Contract["paymentStatus"]) ?? "pending",
    billingTrigger: (c.billing_trigger as Contract["billingTrigger"]) ?? (c.type === "defined" ? "on_start" : "on_end"),
    pendingExtraAmount: c.pending_extra_amount != null ? Number(c.pending_extra_amount) : undefined,
    pendingRefundAmount: c.pending_refund_amount != null ? Number(c.pending_refund_amount) : undefined,
    agendado: c.agendado ?? false,
    ratePerHour: Number(c.hourly_rate),
    startedAt: c.started_at ? new Date(c.started_at).getTime() : 0,
    scheduledFor: c.scheduled_for
      ? new Date(c.scheduled_for).getTime()
      : undefined,
    createdAt: c.created_at ? new Date(c.created_at).getTime() : 0,
    status: mapDbStatusToUi(c.status),
    endedAt: c.ended_at ? new Date(c.ended_at).getTime() : undefined,
    totalAmount: c.total_amount ? Number(c.total_amount) : undefined,
    endReason: pendingEnd?.reason ?? undefined,
    cancelReason: pendingCancel?.reason ?? undefined,
    endRequestedBy: pendingEnd?.requested_by ?? undefined,
    cancelRequestedBy: pendingCancel?.requested_by ?? undefined,
    location: c.location ?? undefined,
  };
}

const CONTRACT_SELECT = `
  *,
  contractor:profiles!contractor_id(id, name, first_name),
  hired:profiles!hired_id(id, name, first_name, provider_profiles(nota, avaliacoes, total_contracts)),
  service:provider_services!service_id(id, nome, nota, avaliacoes, valor_hora),
  action_requests:contract_action_requests(id, type, status, requested_by, reason, created_at)
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

type AuditSnapshot = {
  device_id: string | null;
  device_platform: string | null;
  app_version: string | null;
  ip_address: string | null;
  user_agent: string | null;
  latitude: number | null;
  longitude: number | null;
  location_accuracy_meters: number | null;
};

async function getAuditSnapshot(): Promise<AuditSnapshot> {
  let latitude: number | null = null;
  let longitude: number | null = null;
  let location_accuracy_meters: number | null = null;

  try {
    const permission = await ExpoLocation.getForegroundPermissionsAsync();
    if (permission.status === "granted") {
      const pos = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.Balanced,
      });
      latitude = pos.coords.latitude;
      longitude = pos.coords.longitude;
      location_accuracy_meters = pos.coords.accuracy ?? null;
    }
  } catch (e) {
    console.warn("[ContractsContext] audit location error:", e);
  }

  return {
    device_id:
      Constants.sessionId ??
      Device.osBuildId ??
      Device.osInternalBuildId ??
      null,
    device_platform: Platform.OS,
    app_version:
      Constants.expoConfig?.version ??
      Constants.nativeAppVersion ??
      null,
    ip_address: null,
    user_agent:
      `${Device.manufacturer ?? "unknown"} ${Device.modelName ?? "unknown"} / ${Device.osName ?? Platform.OS} ${Device.osVersion ?? ""}`.trim(),
    latitude,
    longitude,
    location_accuracy_meters,
  };
}

function getActorRole(contract: Contract | undefined, actorId: string): "contractor" | "hired" | "unknown" {
  if (!contract) return "unknown";
  const otherId = contract.person.profileId;
  if (contract.role === "hiring") {
    return actorId === otherId ? "hired" : "contractor";
  }
  return actorId === otherId ? "contractor" : "hired";
}

async function recordContractEvent({
  contractId,
  actorId,
  actorRole,
  eventType,
  reason,
  metadata,
}: {
  contractId: string;
  actorId: string;
  actorRole: "contractor" | "hired" | "platform" | "admin" | "unknown";
  eventType: string;
  reason?: string;
  metadata?: Record<string, any>;
}) {
  const audit = await getAuditSnapshot();
  const row = {
    contract_id: contractId,
    actor_id: actorId,
    actor_role: actorRole,
    event_type: eventType,
    reason: reason ?? null,
    metadata: metadata ?? {},
    ...audit,
  };

  const eventRes = await supabase.from("contract_events").insert(row);

  if (eventRes.error) {
    console.warn("[ContractsContext] contract_events insert error:", eventRes.error.message);
  }
}

async function createActionRequest({
  contractId,
  type,
  requestedBy,
  reason,
  amount,
}: {
  contractId: string;
  type: "end" | "cancel" | "payment" | "change_amount" | "dispute_resolution";
  requestedBy: string;
  reason?: string;
  amount?: number;
}) {
  const { error } = await supabase.from("contract_action_requests").insert({
    contract_id: contractId,
    type,
    requested_by: requestedBy,
    reason: reason ?? null,
    amount: amount ?? null,
  });
  if (error) {
    console.warn("[ContractsContext] action request insert error:", error.message);
  }
}

async function settleActionRequest(
  contractId: string,
  type: "end" | "cancel" | "payment" | "change_amount" | "dispute_resolution",
  status: "accepted" | "rejected" | "cancelled" | "expired",
  respondedBy: string,
  responseReason?: string
) {
  const { error } = await supabase
    .from("contract_action_requests")
    .update({
      status,
      responded_by: respondedBy,
      response_reason: responseReason ?? null,
      responded_at: new Date().toISOString(),
    })
    .eq("contract_id", contractId)
    .eq("type", type)
    .eq("status", "pending");

  if (error) {
    console.warn("[ContractsContext] action request update error:", error.message);
  }
}

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

  const broadcastUpdate = useCallback(
    (contractId: string, contractorId: string | null, hiredId: string | null) => {
      if (broadcastChannelRef.current && broadcastReadyRef.current) {
        broadcastChannelRef.current.send({
          type: "broadcast",
          event: "contract-updated",
          payload: { contract_id: contractId, contractor_id: contractorId, hired_id: hiredId },
        });
      }
    },
    []
  );

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
    let deliveriesChannel: ReturnType<typeof supabase.channel> | null = null;

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

      // Detecta reconexão: quando um canal volta ao estado SUBSCRIBED depois
      // de já ter estado conectado, significa que houve uma queda e reconexão
      // do WebSocket — eventos podem ter sido perdidos, então fazemos refresh.
      const makeReconnectHandler = (onReconnect: () => void) => {
        let everSubscribed = false;
        return (status: string) => {
          if (status === "SUBSCRIBED") {
            if (everSubscribed) {
              onReconnect();
            } else {
              everSubscribed = true;
            }
          }
        };
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
        .subscribe(makeReconnectHandler(handleChange));

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
        .subscribe(makeReconnectHandler(handleChange));

      // contract_deliveries: hired party gets notified when contractor finalizes.
      // The draft contract becomes visible only after the delivery INSERT fires,
      // because RLS hides 'draft' status contracts from the hired party.
      deliveriesChannel = supabase
        .channel("contract-deliveries-as-recipient")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "contract_deliveries",
            filter: `recipient_id=eq.${user.id}`,
          },
          async () => {
            const now = Date.now();
            if (now - lastNewContractVibratedAt.current > 2000) {
              lastNewContractVibratedAt.current = now;
              Vibration.vibrate([0, 700, 300, 700, 300, 700]);
            }
            await handleChange();
          }
        )
        .subscribe(makeReconnectHandler(handleChange));

      const broadcastCh = supabase
        .channel("krono-contract-events")
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
        .on("broadcast", { event: "contract-updated" }, async (msg) => {
          if (
            msg.payload?.contractor_id === user.id ||
            msg.payload?.hired_id === user.id
          ) {
            await handleChange();
          }
        })
        .subscribe((() => {
          const onReconnect = makeReconnectHandler(handleChange);
          return (s: string) => {
            broadcastReadyRef.current = s === "SUBSCRIBED";
            onReconnect(s);
          };
        })());
      broadcastChannelRef.current = broadcastCh;
    };

    init();

    // ── AppState: refresh ao voltar para o foreground ──────────────────────────
    // Quando o app vai para background, o WebSocket do Realtime pode ser
    // suspenso pelo SO e eventos podem ser perdidos. Ao voltar ao foreground,
    // fazemos um fetch direto do banco para garantir o estado mais recente.
    const appStateRef = { current: AppState.currentState };
    const appStateSub = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        const wasBackground =
          appStateRef.current === "background" ||
          appStateRef.current === "inactive";
        const isNowActive = nextState === "active";
        appStateRef.current = nextState;

        if (wasBackground && isNowActive && userIdRef.current) {
          loadContracts(userIdRef.current, { showLoading: false });
        }
      }
    );

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
      appStateSub.remove();
      subscription.unsubscribe();
      if (contractorChannel) supabase.removeChannel(contractorChannel);
      if (hiredChannel) supabase.removeChannel(hiredChannel);
      if (deliveriesChannel) supabase.removeChannel(deliveriesChannel);
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
    ): Promise<{ id: string; clientSecret?: string }> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const serviceId =
        contractData.serviceId ?? contractData.servico?.serviceId ?? null;

      const isDefinido = contractData.tipo === "timer";
      const billingTrigger = isDefinido ? "on_start" : "on_end";

      const { data: contract, error } = await supabase
        .from("contracts")
        .insert({
          contractor_id: user.id,
          hired_id: contractData.person.profileId ?? user.id,
          type: isDefinido ? "defined" : "open",
          status: initialStatus,
          hourly_rate: contractData.ratePerHour,
          total_hours: contractData.duracaoTotal
            ? contractData.duracaoTotal / 3600000
            : null,
          service_id: serviceId,
          payment_method: mapPaymentMethodToDb(contractData.paymentMethod),
          payment_card_label: contractData.paymentCardLabel ?? null,
          billing_trigger: billingTrigger,
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

      // ── Pré-pagamento para contratos DEFINIDOS ────────────────────────────
      // Contratos de tempo definido têm billing_trigger='on_start':
      // o pagamento é criado/bloqueado na criação do contrato.
      let pendingClientSecret: string | undefined;
      if (isDefinido && contractData.paymentMethod && contractData.duracaoTotal) {
        const preAmount = parseFloat(
          ((contractData.duracaoTotal / 3600000) * contractData.ratePerHour).toFixed(2)
        );
        const payerId = user.id;
        const payeeId = contractData.person.profileId;
        const methodDb = mapPaymentMethodToDb(contractData.paymentMethod);

        if (payerId && payeeId && methodDb && preAmount > 0) {
          let prePaymentStatus: string;

          if (contractData.paymentMethod === "saldo") {
            // Debita da wallet imediatamente
            const { data: wallet } = await supabase
              .from("wallets")
              .select("id, balance")
              .eq("profile_id", payerId)
              .maybeSingle();

            if (wallet && wallet.balance >= preAmount) {
              const newBalance = parseFloat((wallet.balance - preAmount).toFixed(2));
              await supabase.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);
              await supabase.from("wallet_transactions").insert({
                wallet_id: wallet.id,
                profile_id: payerId,
                type: "payment",
                status: "completed",
                amount: preAmount,
                balance_before: wallet.balance,
                balance_after: newBalance,
                description: `Pagamento antecipado – contrato #${contract.id.slice(0, 8)}`,
                contract_id: contract.id,
                
              });
              prePaymentStatus = "confirmed";
            } else {
              // Saldo insuficiente – registra como falha para tratar no detalhe
              prePaymentStatus = "pending_retry";
              await supabase.from("contracts").update({ payment_status: "failed" }).eq("id", contract.id);
            }
          } else if (contractData.paymentMethod === "cartao") {
            // Cria PaymentIntent real no servidor Railway
            try {
              const { data: { session } } = await supabase.auth.getSession();
              const intent = await createStripePaymentIntent({
                contractId: contract.id,
                amount: preAmount,
                customerEmail: session?.user?.email,
                customerName: session?.user?.user_metadata?.name ?? contractData.person.name,
                payerProfileId: payerId,
                payeeProfileId: payeeId ?? undefined,
                metadata: { billing_trigger: "on_start" },
              });
              pendingClientSecret = intent.clientSecret;
              prePaymentStatus = "pending_payment";
            } catch (err) {
              console.warn("[ContractsContext] Falha ao criar PaymentIntent (on_start):", err);
              prePaymentStatus = "held";
            }
          } else if (contractData.paymentMethod === "pix") {
            // PIX será exibido no modal – status aguardando confirmação
            prePaymentStatus = "pending_request";
          } else {
            // dinheiro – confirmação dupla no encerramento
            prePaymentStatus = "awaiting_dual_confirmation";
          }

          sideEffects.push(
            supabase.from("contract_payments").insert({
              contract_id: contract.id,
              payer_id: payerId,
              payee_id: payeeId,
              method: methodDb === "balance" ? "wallet_balance" : methodDb,
              amount: preAmount,
              status: prePaymentStatus,
              requested_by: user.id,
              confirmed_at: contractData.paymentMethod === "saldo" && prePaymentStatus === "confirmed"
                ? new Date().toISOString()
                : null,
            })
          );
        }
      }

      await Promise.all(sideEffects);
      await recordContractEvent({
        contractId: contract.id,
        actorId: user.id,
        actorRole: "contractor",
        eventType: initialStatus === "active" ? "started" : "created",
      });
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

      return { id: contract.id, clientSecret: pendingClientSecret };
    },
    [loadContracts, sendPushNotification]
  );

  // ── Draft contract flow ───────────────────────────────────────────────────────
  // createDraftContract → processPaymentForDraftContract → finalizeContract
  // (or deleteDraftContract on cancel)

  const createDraftContract = useCallback(
    async (contractData: Omit<Contract, "id" | "status" | "startedAt" | "paymentStatus" | "billingTrigger" | "createdAt" | "endedAt" | "totalAmount" | "endReason" | "cancelReason" | "endRequestedBy" | "cancelRequestedBy" | "pendingExtraAmount" | "pendingRefundAmount"> & { serviceId?: string }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const contractorId = user.id;
      const hiredId = contractData.person.profileId ?? user.id;
      const scheduledFor = contractData.scheduledFor ?? Date.now();

      const { data: contract, error } = await supabase
        .from("contracts")
        .insert({
          status: "draft",
          contractor_id: contractorId,
          hired_id: hiredId,
          type: contractData.tipo === "cronometro" ? "open" : "defined",
          total_hours:
            contractData.tipo === "timer" && contractData.duracaoTotal
              ? contractData.duracaoTotal / 3600000
              : null,
          service_id: contractData.serviceId ?? null,
          hourly_rate: contractData.ratePerHour ?? 0,
          payment_method: mapPaymentMethodToDb(contractData.paymentMethod),
          payment_card_label: contractData.paymentCardLabel ?? null,
          payment_status: "pending",
          billing_trigger:
            contractData.tipo === "timer" ? "on_start" : "on_end",
          agendado: contractData.agendado ?? false,
          scheduled_for: new Date(scheduledFor).toISOString(),
          location: contractData.location ?? null,
        })
        .select("id")
        .single();

      if (error || !contract) throw new Error(error?.message ?? "Erro ao criar rascunho");

      await supabase.from("contract_parties").insert({
        contract_id: contract.id,
        user_id: contractorId,
        role: "contractor",
      });
      await supabase.from("contract_parties").insert({
        contract_id: contract.id,
        user_id: hiredId,
        role: "hired",
      });

      return { id: contract.id as string };
    },
    []
  );

  const processPaymentForDraftContract = useCallback(
    async (
      contractId: string,
      params: { method: string; amount: number; pixPaymentIntentId?: string }
    ): Promise<{ clientSecret?: string }> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { method, amount } = params;
      let clientSecret: string | undefined;

      if (method === "cartao" && amount > 0) {
        // Create a Stripe PaymentIntent and return the client secret
        const { data: row } = await supabase
          .from("contracts")
          .select("hired_id")
          .eq("id", contractId)
          .single();
        const hiredId = row?.hired_id ?? "";
        const piResult = await createStripePaymentIntent({
          contractId,
          amount,
          payerProfileId: user.id,
          payeeProfileId: hiredId,
        });
        clientSecret = piResult?.clientSecret;
        await supabase.from("contract_payments").insert({
          contract_id: contractId,
          amount,
          method: "card",
          status: "pending_request",
          stripe_payment_intent_id: piResult?.paymentIntentId ?? null,
          payer_id: user.id,
          payee_id: hiredId,
        });
      } else if (method === "saldo" && amount > 0) {
        // Debit wallet immediately
        const { data: wallet } = await supabase
          .from("wallets")
          .select("id, balance")
          .eq("profile_id", user.id)
          .single();
        if (!wallet) throw new Error("Carteira não encontrada");
        const balance = Number(wallet.balance);
        if (balance < amount) throw new Error("Saldo insuficiente");
        const newBalance = balance - amount;
        const { data: row } = await supabase
          .from("contracts")
          .select("hired_id")
          .eq("id", contractId)
          .single();
        const hiredId = row?.hired_id ?? "";
        await supabase.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);
        await supabase.from("wallet_transactions").insert({
          wallet_id: wallet.id,
          type: "debit",
          amount,
          description: `Débito para contrato #${contractId.substring(0, 8)}`,
          related_contract_id: contractId,
        });
        await supabase.from("contract_payments").insert({
          contract_id: contractId,
          amount,
          method: "wallet",
          status: "completed",
          payer_id: user.id,
          payee_id: hiredId,
        });
        await supabase
          .from("contracts")
          .update({ payment_status: "completed" })
          .eq("id", contractId);
      } else {
        // Cash, PIX, card-open — payment at end; just record the intent
        const { data: row } = await supabase
          .from("contracts")
          .select("hired_id")
          .eq("id", contractId)
          .single();
        const hiredId = row?.hired_id ?? "";
        await supabase.from("contract_payments").insert({
          contract_id: contractId,
          amount: amount > 0 ? amount : 0,
          method:
            method === "cartao" ? "card" : method === "pix" ? "pix" : "cash",
          status: "pending_request",
          stripe_payment_intent_id: params.pixPaymentIntentId ?? null,
          payer_id: user.id,
          payee_id: hiredId,
        });
      }

      return { clientSecret };
    },
    []
  );

  const finalizeContract = useCallback(
    async (contractId: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Fetch contract details for notification and delivery
      const { data: contract, error: fetchError } = await supabase
        .from("contracts")
        .select("hired_id, service:provider_services!service_id(nome)")
        .eq("id", contractId)
        .single();

      if (fetchError || !contract) throw new Error("Contrato não encontrado");

      // Move contract from draft → pending_signature
      const { error: updateError } = await supabase
        .from("contracts")
        .update({ status: "pending_signature" })
        .eq("id", contractId)
        .eq("status", "draft");

      if (updateError) throw new Error(updateError.message);

      // Create delivery record — this is what the hired party's realtime listens for
      await supabase.from("contract_deliveries").insert({
        contract_id: contractId,
        recipient_id: contract.hired_id,
        status: "pending",
        delivered_at: new Date().toISOString(),
      });

      const hiredId = contract.hired_id as string;
      const serviceName =
        (contract as any).service?.nome ?? "serviço";

      // Broadcast and push notify
      if (broadcastChannelRef.current && broadcastReadyRef.current) {
        broadcastChannelRef.current.send({
          type: "broadcast",
          event: "contract-created",
          payload: { hired_id: hiredId, contract_id: contractId },
        });
      }

      await recordContractEvent({
        contractId,
        actorId: user.id,
        actorRole: "contractor",
        eventType: "created",
      });

      if (hiredId) {
        sendPushNotification(
          hiredId,
          "Nova contratação!",
          `Você foi contratado para ${serviceName}.`,
          { contract_id: contractId },
          "contract_created"
        ).catch(() => {});
      }

      sendPushNotification(
        user.id,
        "Contrato enviado",
        `Sua solicitação de ${serviceName} foi enviada.`,
        { contract_id: contractId },
        "contract_created"
      ).catch(() => {});

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });
    },
    [loadContracts, sendPushNotification]
  );

  const deleteDraftContract = useCallback(async (contractId: string) => {
    await supabase
      .from("contracts")
      .delete()
      .eq("id", contractId)
      .eq("status", "draft");
  }, []);

  const markDeliveryAsSeen = useCallback(async (contractId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const now = new Date().toISOString();
    await supabase
      .from("contract_deliveries")
      .update({ status: "seen", seen_at: now })
      .eq("contract_id", contractId)
      .eq("recipient_id", user.id)
      .neq("status", "seen");
  }, []);

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

      await recordContractEvent({
        contractId: id,
        actorId: user.id,
        actorRole: "hired",
        eventType: "accepted",
      });

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const { data: row } = await supabase
        .from("contracts")
        .select("contractor_id, hired_id")
        .eq("id", id)
        .single();

      broadcastUpdate(id, row?.contractor_id ?? null, row?.hired_id ?? null);

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
    [loadContracts, sendPushNotification, broadcastUpdate]
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

      await recordContractEvent({
        contractId: id,
        actorId: user.id,
        actorRole: "hired",
        eventType: "rejected",
      });

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const { data: row } = await supabase
        .from("contracts")
        .select("contractor_id, hired_id")
        .eq("id", id)
        .single();

      broadcastUpdate(id, row?.contractor_id ?? null, row?.hired_id ?? null);

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
    [loadContracts, sendPushNotification, broadcastUpdate]
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

      await recordContractEvent({
        contractId: id,
        actorId: user.id,
        actorRole: "hired",
        eventType: "started",
      });

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const { data: row } = await supabase
        .from("contracts")
        .select("contractor_id, hired_id")
        .eq("id", id)
        .single();

      broadcastUpdate(id, row?.contractor_id ?? null, row?.hired_id ?? null);

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
    [loadContracts, sendPushNotification, broadcastUpdate]
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

      await recordContractEvent({
        contractId: id,
        actorId: user.id,
        actorRole: getActorRole(contract, user.id),
        eventType: "cancelled",
      });

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const otherPartyId = contract?.person.profileId;
      const isHiring = contract?.role === "hiring";
      const contractorId = isHiring ? userIdRef.current : (otherPartyId ?? null);
      const hiredId = isHiring ? (otherPartyId ?? null) : userIdRef.current;
      broadcastUpdate(id, contractorId, hiredId);

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
    [activeContracts, loadContracts, sendPushNotification, broadcastUpdate]
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
        })
        .eq("id", id);

      if (error) throw new Error(error.message);

      await createActionRequest({
        contractId: id,
        type: "end",
        requestedBy: user.id,
        reason,
      });

      const contract = activeContracts.find((c) => c.id === id);

      await recordContractEvent({
        contractId: id,
        actorId: user.id,
        actorRole: getActorRole(contract, user.id),
        eventType: "end_requested",
        reason,
      });

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const otherPartyId = contract?.person.profileId;
      const isHiring = contract?.role === "hiring";
      const contractorId = isHiring ? userIdRef.current : (otherPartyId ?? null);
      const hiredId = isHiring ? (otherPartyId ?? null) : userIdRef.current;
      broadcastUpdate(id, contractorId, hiredId);

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
    [activeContracts, loadContracts, sendPushNotification, broadcastUpdate]
  );

  // ── Confirmar encerramento ────────────────────────────────────────────────────
  //
  // Matriz de resolução de pagamento:
  //  billing_trigger='on_end' (ABERTO):
  //    → gera payment agora pelo total medido
  //    → dinheiro: dual-confirmation; saldo: debita wallet; cartao/pix: registra
  //  billing_trigger='on_start' (DEFINIDO):
  //    → payment já existe (criado na abertura)
  //    → delta = realAmount - preAmount
  //    → delta < 0: reembolso (wallet ou contract_refunds)
  //    → delta > 0: cria payment extra com status pending_retry
  //    → delta = 0: confirma payment existente

  const confirmEndContract = useCallback(
    async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const contract = activeContracts.find((c) => c.id === id);
      if (!contract) throw new Error("Contrato não encontrado");

      const endedAt = Date.now();
      const durationHours = (endedAt - contract.startedAt) / 1000 / 3600;
      const fixedHours = contract.duracaoTotal ? contract.duracaoTotal / 1000 / 3600 : null;

      const realAmount = parseFloat(
        (
          (
            contract.tipo === "timer" && fixedHours !== null && durationHours > fixedHours
              ? durationHours
              : contract.tipo === "timer" && fixedHours !== null && durationHours >= fixedHours
              ? fixedHours
              : durationHours
          ) * contract.ratePerHour
        ).toFixed(2)
      );

      const reason = contract.endReason ?? "Encerrado com acordo mútuo";
      const paymentMethodDb = mapPaymentMethodToDb(contract.paymentMethod);
      const payerId = contract.role === "hiring" ? user.id : contract.person.profileId;
      const payeeId = contract.role === "hiring" ? contract.person.profileId : user.id;

      let finalPaymentStatus: string;
      let contractPendingExtra: number | null = null;
      let contractPendingRefund: number | null = null;
      let endClientSecret: string | undefined;

      if (contract.billingTrigger === "on_end") {
        // ── Contrato ABERTO ─────────────────────────────────────────────────
        if (contract.paymentMethod === "dinheiro") {
          finalPaymentStatus = "awaiting_confirmation";
        } else if (contract.paymentMethod === "saldo" && payerId) {
          const { data: wallet } = await supabase
            .from("wallets")
            .select("id, balance")
            .eq("profile_id", payerId)
            .maybeSingle();

          if (wallet && Number(wallet.balance) >= Number(realAmount)) {
            const prev = Number(wallet.balance);
            const real = Number(realAmount);
            const newBalance = parseFloat((prev - real).toFixed(2));
            await supabase.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);
            await supabase.from("wallet_transactions").insert({
              wallet_id: wallet.id,
              profile_id: payerId,
              type: "payment",
              status: "completed",
              amount: real,
              balance_before: prev,
              balance_after: newBalance,
              description: `Pagamento de serviço – contrato #${id.slice(0, 8)}`,
              contract_id: id,
              
            });
            finalPaymentStatus = "paid";
          } else {
            finalPaymentStatus = "failed";
            contractPendingExtra = Number(realAmount);
          }
        } else if (contract.paymentMethod === "cartao") {
          // Cria PaymentIntent real no servidor Railway para cobrar o cartão
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const intent = await createStripePaymentIntent({
              contractId: id,
              amount: realAmount,
              customerEmail: session?.user?.email,
              customerName: session?.user?.user_metadata?.name,
              payerProfileId: payerId ?? undefined,
              payeeProfileId: payeeId ?? undefined,
              metadata: { billing_trigger: "on_end" },
            });
            endClientSecret = intent.clientSecret;
            finalPaymentStatus = "pending_payment";
          } catch (err) {
            console.warn("[ContractsContext] Falha ao criar PaymentIntent (on_end):", err);
            finalPaymentStatus = "paid";
          }
        } else {
          finalPaymentStatus = "paid";
        }

        if (payerId && payeeId && paymentMethodDb && contract.paymentMethod !== "dinheiro") {
          await supabase.from("contract_payments").insert({
            contract_id: id,
            payer_id: payerId,
            payee_id: payeeId,
            method: paymentMethodDb === "balance" ? "wallet_balance" : paymentMethodDb,
            amount: Number(realAmount),
            status: finalPaymentStatus === "paid" ? "confirmed" : "pending_retry",
            requested_by: user.id,
            confirmed_at: finalPaymentStatus === "paid" ? new Date().toISOString() : null,
          });
        }

        if (contract.paymentMethod === "dinheiro" && payerId && payeeId) {
          const { data: existingCash } = await supabase
            .from("contract_payments")
            .select("id")
            .eq("contract_id", id)
            .eq("method", "cash")
            .maybeSingle();
          if (!existingCash) {
            await supabase.from("contract_payments").insert({
              contract_id: id,
              payer_id: payerId,
              payee_id: payeeId,
              method: "cash",
              amount: Number(realAmount),
              status: "awaiting_dual_confirmation",
              requested_by: user.id,
            });
          }
          await createActionRequest({
            contractId: id,
            type: "payment",
            requestedBy: user.id,
            amount: Number(realAmount),
          });
        }
      } else {
        // ── Contrato DEFINIDO: billing_trigger = 'on_start' ─────────────────
        const { data: prePayment } = await supabase
          .from("contract_payments")
          .select("id, amount, status, method, payer_id, payee_id")
          .eq("contract_id", id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        const preAmount = prePayment ? Number(prePayment.amount) : 0;
        const delta = parseFloat((Number(realAmount) - preAmount).toFixed(2));

        if (Math.abs(delta) < 0.01) {
          if (prePayment) {
            await supabase.from("contract_payments").update({
              status: "confirmed",
              confirmed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("id", prePayment.id);
          }
          finalPaymentStatus = "paid";
        } else if (delta < 0) {
          const refundAmount = Math.abs(delta);
          contractPendingRefund = refundAmount;

          if (prePayment) {
            await supabase.from("contract_payments").update({
              amount: Number(realAmount),
              status: "confirmed",
              confirmed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("id", prePayment.id);
          }

          if (contract.paymentMethod === "saldo" && payerId) {
            const { data: wallet } = await supabase
              .from("wallets")
              .select("id, balance")
              .eq("profile_id", payerId)
              .maybeSingle();
            if (wallet) {
              const prev = Number(wallet.balance);
              const newBalance = parseFloat((prev + refundAmount).toFixed(2));
              await supabase.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);
              const { data: walletTx } = await supabase.from("wallet_transactions").insert({
                wallet_id: wallet.id,
                profile_id: payerId,
                type: "refund",
                status: "completed",
                amount: refundAmount,
                balance_before: prev,
                balance_after: newBalance,
                description: `Reembolso encerramento antecipado – contrato #${id.slice(0, 8)}`,
                contract_id: id,
                
              }).select("id").single();

              await supabase.from("contract_refunds").insert({
                contract_id: id,
                payment_id: prePayment?.id ?? null,
                profile_id: payerId,
                amount: refundAmount,
                reason: "early_end",
                status: "processed",
                wallet_tx_id: walletTx?.id ?? null,
                processed_at: new Date().toISOString(),
              });
            }
          } else {
            await supabase.from("contract_refunds").insert({
              contract_id: id,
              payment_id: prePayment?.id ?? null,
              profile_id: payerId ?? user.id,
              amount: refundAmount,
              reason: "early_end",
              status: "pending",
            });
          }
          finalPaymentStatus = "paid";
        } else {
          contractPendingExtra = delta;

          if (prePayment) {
            await supabase.from("contract_payments").update({
              status: "confirmed",
              confirmed_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }).eq("id", prePayment.id);
          }

          if (payerId && payeeId && paymentMethodDb) {
            await supabase.from("contract_payments").insert({
              contract_id: id,
              payer_id: payerId,
              payee_id: payeeId,
              method: paymentMethodDb === "balance" ? "wallet_balance" : paymentMethodDb,
              amount: delta,
              status: "pending_retry",
              requested_by: user.id,
            });
          }
          finalPaymentStatus = "awaiting_confirmation";
        }
      }

      // ── Atualiza contrato ─────────────────────────────────────────────────
      const contractUpdate: Record<string, any> = {
        status: "ended",
        ended_at: new Date(endedAt).toISOString(),
        total_amount: Number(realAmount),
        payment_status: finalPaymentStatus,
      };
      if (contractPendingExtra != null) contractUpdate.pending_extra_amount = contractPendingExtra;
      if (contractPendingRefund != null) contractUpdate.pending_refund_amount = contractPendingRefund;

      const { error } = await supabase
        .from("contracts")
        .update(contractUpdate)
        .eq("id", id);

      if (error) throw new Error(error.message);

      await settleActionRequest(id, "end", "accepted", user.id, reason);

      await recordContractEvent({
        contractId: id,
        actorId: user.id,
        actorRole: getActorRole(contract, user.id),
        eventType: "ended",
        reason,
        metadata: {
          total_amount: Number(realAmount),
          payment_method: paymentMethodDb,
          billing_trigger: contract.billingTrigger,
          pending_extra: contractPendingExtra,
          pending_refund: contractPendingRefund,
        },
      });

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const otherPartyId = contract.person.profileId;
      const isHiring = contract.role === "hiring";
      const contractorId = isHiring ? userIdRef.current : (otherPartyId ?? null);
      const hiredId = isHiring ? (otherPartyId ?? null) : userIdRef.current;
      broadcastUpdate(id, contractorId, hiredId);

      const amountLabel = formatCurrency(Number(realAmount));
      const extraLabel = contractPendingExtra
        ? ` Valor extra pendente: ${formatCurrency(contractPendingExtra)}.`
        : "";
      const refundLabel = contractPendingRefund
        ? ` Reembolso de ${formatCurrency(contractPendingRefund)} processado.`
        : "";

      if (otherPartyId) {
        sendPushNotification(
          otherPartyId,
          "Contrato encerrado",
          `Contrato encerrado. Valor: ${amountLabel}.${extraLabel}${refundLabel}`,
          { contract_id: id },
          "contract_ended"
        ).catch(() => {});
      }

      sendPushNotification(
        user.id,
        "Contrato encerrado",
        `Você confirmou o encerramento. Valor: ${amountLabel}.${extraLabel}${refundLabel}`,
        { contract_id: id },
        "contract_ended"
      ).catch(() => {});

      return { clientSecret: endClientSecret };
    },
    [activeContracts, loadContracts, sendPushNotification, broadcastUpdate]
  );

  // ── Recusar encerramento ──────────────────────────────────────────────────────

  const rejectEndRequest = useCallback(
    async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("contracts")
        .update({
          status: "active",
        })
        .eq("id", id);

      if (error) throw new Error(error.message);

      await settleActionRequest(id, "end", "rejected", user.id);

      const contract = activeContracts.find((c) => c.id === id);

      await recordContractEvent({
        contractId: id,
        actorId: user.id,
        actorRole: getActorRole(contract, user.id),
        eventType: "end_rejected",
      });

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const otherPartyId = contract?.person.profileId;
      const isHiring = contract?.role === "hiring";
      const contractorId = isHiring ? userIdRef.current : (otherPartyId ?? null);
      const hiredId = isHiring ? (otherPartyId ?? null) : userIdRef.current;
      broadcastUpdate(id, contractorId, hiredId);

      if (otherPartyId) {
        sendPushNotification(
          otherPartyId,
          "Encerramento recusado",
          "A outra parte recusou o encerramento. O contrato continua ativo.",
          { contract_id: id },
          "contract_updated"
        ).catch(() => {});
      }
    },
    [activeContracts, loadContracts, sendPushNotification, broadcastUpdate]
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
        })
        .eq("id", id);

      if (error) throw new Error(error.message);

      await createActionRequest({
        contractId: id,
        type: "cancel",
        requestedBy: user.id,
        reason,
      });

      const contract = activeContracts.find((c) => c.id === id);

      await recordContractEvent({
        contractId: id,
        actorId: user.id,
        actorRole: getActorRole(contract, user.id),
        eventType: "cancel_requested",
        reason,
      });

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const otherPartyId = contract?.person.profileId;
      const isHiring = contract?.role === "hiring";
      const contractorId = isHiring ? userIdRef.current : (otherPartyId ?? null);
      const hiredId = isHiring ? (otherPartyId ?? null) : userIdRef.current;
      broadcastUpdate(id, contractorId, hiredId);

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
    [activeContracts, loadContracts, sendPushNotification, broadcastUpdate]
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

      const reason = contract?.cancelReason ?? "Cancelado com acordo mútuo";

      await settleActionRequest(id, "cancel", "accepted", user.id, reason);

      await recordContractEvent({
        contractId: id,
        actorId: user.id,
        actorRole: getActorRole(contract, user.id),
        eventType: "cancel_confirmed",
        reason,
      });

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const otherPartyId = contract?.person.profileId;
      const isHiring = contract?.role === "hiring";
      const contractorId = isHiring ? userIdRef.current : (otherPartyId ?? null);
      const hiredId = isHiring ? (otherPartyId ?? null) : userIdRef.current;
      broadcastUpdate(id, contractorId, hiredId);

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
    [activeContracts, loadContracts, sendPushNotification, broadcastUpdate]
  );

  // ── Recusar cancelamento ──────────────────────────────────────────────────────

  const rejectCancelRequest = useCallback(
    async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const contractBeforeUpdate = activeContracts.find((c) => c.id === id);

      const { error } = await supabase
        .from("contracts")
        .update({
          status: "active",
        })
        .eq("id", id);

      if (error) throw new Error(error.message);

      const reason = contractBeforeUpdate?.cancelReason ?? undefined;
      await settleActionRequest(id, "cancel", "rejected", user.id, reason);

      await recordContractEvent({
        contractId: id,
        actorId: user.id,
        actorRole: getActorRole(contractBeforeUpdate, user.id),
        eventType: "cancel_rejected",
        reason,
      });

      if (userIdRef.current)
        await loadContracts(userIdRef.current, { showLoading: false });

      const contract = activeContracts.find((c) => c.id === id);
      const otherPartyId = contract?.person.profileId;
      const isHiring = contract?.role === "hiring";
      const contractorId = isHiring ? userIdRef.current : (otherPartyId ?? null);
      const hiredId = isHiring ? (otherPartyId ?? null) : userIdRef.current;
      broadcastUpdate(id, contractorId, hiredId);

      if (otherPartyId) {
        sendPushNotification(
          otherPartyId,
          "Cancelamento recusado",
          "A outra parte recusou o cancelamento. O contrato continua ativo.",
          { contract_id: id },
          "contract_updated"
        ).catch(() => {});
      }
    },
    [activeContracts, loadContracts, sendPushNotification, broadcastUpdate]
  );

  const ensureCashPayment = useCallback(
    async (contract: Contract, userId: string) => {
      const { data: existing, error: existingError } = await supabase
        .from("contract_payments")
        .select("*")
        .eq("contract_id", contract.id)
        .eq("method", "cash")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingError) throw new Error(existingError.message);
      if (existing) return existing;

      const payerId = contract.role === "hiring" ? userId : contract.person.profileId;
      const payeeId = contract.role === "hiring" ? contract.person.profileId : userId;
      if (!payerId || !payeeId) throw new Error("Partes do pagamento não encontradas");

      const { data, error } = await supabase
        .from("contract_payments")
        .insert({
          contract_id: contract.id,
          payer_id: payerId,
          payee_id: payeeId,
          method: "cash",
          amount: contract.totalAmount ?? 0,
          status: "awaiting_dual_confirmation",
          requested_by: userId,
        })
        .select()
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Falha ao criar pagamento em dinheiro");
      }

      return data;
    },
    []
  );

  const confirmCashPayment = useCallback(
    async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const contract = [...activeContracts, ...history].find((c) => c.id === id);
      if (!contract) throw new Error("Contrato não encontrado");
      if (contract.paymentMethod !== "dinheiro") {
        throw new Error("Este contrato não usa pagamento em dinheiro");
      }

      const payment = await ensureCashPayment(contract, user.id);
      const audit = await getAuditSnapshot();
      const role = user.id === payment.payer_id ? "payer" : "payee";
      const confirmationType = role === "payer" ? "paid" : "received";

      const { error: confirmationError } = await supabase
        .from("contract_payment_confirmations")
        .upsert(
          {
            payment_id: payment.id,
            user_id: user.id,
            role,
            confirmation_type: confirmationType,
            ...audit,
          },
          { onConflict: "payment_id,user_id" }
        );

      if (confirmationError) throw new Error(confirmationError.message);

      const { data: confirmations, error: confirmationsError } = await supabase
        .from("contract_payment_confirmations")
        .select("user_id, confirmation_type")
        .eq("payment_id", payment.id);

      if (confirmationsError) throw new Error(confirmationsError.message);

      const payerConfirmed = confirmations?.some(
        (c) => c.user_id === payment.payer_id && c.confirmation_type === "paid"
      );
      const payeeConfirmed = confirmations?.some(
        (c) => c.user_id === payment.payee_id && c.confirmation_type === "received"
      );
      const confirmed = !!payerConfirmed && !!payeeConfirmed;
      const nextStatus = confirmed
        ? "confirmed"
        : payerConfirmed
        ? "awaiting_payee_confirmation"
        : "awaiting_payer_confirmation";

      const { error: paymentError } = await supabase
        .from("contract_payments")
        .update({
          status: nextStatus,
          confirmed_at: confirmed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      if (paymentError) throw new Error(paymentError.message);

      const { error: contractError } = await supabase
        .from("contracts")
        .update({
          payment_status: confirmed ? "paid" : "awaiting_confirmation",
        })
        .eq("id", id);

      if (contractError) throw new Error(contractError.message);

      if (confirmed) {
        await settleActionRequest(id, "payment", "accepted", user.id);
      }

      await recordContractEvent({
        contractId: id,
        actorId: user.id,
        actorRole: getActorRole(contract, user.id),
        eventType: "payment_confirmed",
        metadata: {
          payment_id: payment.id,
          confirmation_type: confirmationType,
          payment_status: nextStatus,
        },
      });

      if (userIdRef.current) {
        await loadContracts(userIdRef.current, { showLoading: false });
      }

      const otherPartyId = contract.person.profileId;
      const isHiring = contract.role === "hiring";
      const contractorId = isHiring ? userIdRef.current : (otherPartyId ?? null);
      const hiredId = isHiring ? (otherPartyId ?? null) : userIdRef.current;
      broadcastUpdate(id, contractorId, hiredId);

      if (otherPartyId) {
        sendPushNotification(
          otherPartyId,
          confirmed ? "Pagamento confirmado" : "Confirmação de pagamento",
          confirmed
            ? "O pagamento em dinheiro foi confirmado pelas duas partes."
            : "A outra parte confirmou o pagamento em dinheiro. Confirme também para concluir.",
          { contract_id: id, payment_id: payment.id },
          "payment"
        ).catch(() => {});
      }
    },
    [activeContracts, history, ensureCashPayment, loadContracts, sendPushNotification, broadcastUpdate]
  );

  const disputeCashPayment = useCallback(
    async (id: string, reason = "Pagamento em dinheiro contestado") => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const contract = [...activeContracts, ...history].find((c) => c.id === id);
      if (!contract) throw new Error("Contrato não encontrado");
      if (contract.paymentMethod !== "dinheiro") {
        throw new Error("Este contrato não usa pagamento em dinheiro");
      }

      const payment = await ensureCashPayment(contract, user.id);
      const againstUserId = contract.person.profileId ?? null;

      const { error: paymentError } = await supabase
        .from("contract_payments")
        .update({
          status: "disputed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      if (paymentError) throw new Error(paymentError.message);

      const { error: contractError } = await supabase
        .from("contracts")
        .update({
          status: "disputed",
          payment_status: "disputed",
        })
        .eq("id", id);

      if (contractError) throw new Error(contractError.message);

      const { error: disputeError } = await supabase.from("contract_disputes").insert({
        contract_id: id,
        payment_id: payment.id,
        opened_by: user.id,
        against_user_id: againstUserId,
        reason,
        category: "payment_not_received",
      });

      if (disputeError) throw new Error(disputeError.message);

      await settleActionRequest(id, "payment", "rejected", user.id, reason);

      await recordContractEvent({
        contractId: id,
        actorId: user.id,
        actorRole: getActorRole(contract, user.id),
        eventType: "payment_disputed",
        reason,
        metadata: { payment_id: payment.id },
      });

      if (userIdRef.current) {
        await loadContracts(userIdRef.current, { showLoading: false });
      }

      const isHiring = contract.role === "hiring";
      const contractorId = isHiring ? userIdRef.current : (againstUserId ?? null);
      const hiredId = isHiring ? (againstUserId ?? null) : userIdRef.current;
      broadcastUpdate(id, contractorId, hiredId);

      if (againstUserId) {
        sendPushNotification(
          againstUserId,
          "Pagamento contestado",
          "A outra parte abriu uma disputa sobre o pagamento em dinheiro.",
          { contract_id: id, payment_id: payment.id },
          "payment"
        ).catch(() => {});
      }
    },
    [activeContracts, history, ensureCashPayment, loadContracts, sendPushNotification, broadcastUpdate]
  );

  // ── Reportar pagamento em dinheiro (contratante) ──────────────────────────────

  const reportCashPaid = useCallback(
    async (id: string, amountReported: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const contract = [...activeContracts, ...history].find((c) => c.id === id);
      if (!contract) throw new Error("Contrato não encontrado");
      if (contract.paymentMethod !== "dinheiro") throw new Error("Método não é dinheiro");

      const payment = await ensureCashPayment(contract, user.id);
      const audit = await getAuditSnapshot();

      await supabase.from("contract_payment_confirmations").upsert(
        {
          payment_id: payment.id,
          user_id: user.id,
          role: "payer",
          confirmation_type: "paid",
          amount_reported: amountReported,
          is_incomplete: false,
          ...audit,
        },
        { onConflict: "payment_id,user_id" }
      );

      const { data: payeeConf } = await supabase
        .from("contract_payment_confirmations")
        .select("amount_reported, is_incomplete")
        .eq("payment_id", payment.id)
        .eq("user_id", payment.payee_id)
        .maybeSingle();

      const payeeAmount = payeeConf?.amount_reported ?? null;
      const bothConfirmed = payeeAmount !== null;
      const amountsMatch = bothConfirmed && Math.abs(amountReported - payeeAmount) < 0.02;
      const hasInconsistency = bothConfirmed && !amountsMatch;

      await supabase.from("contract_payments").update({
        status: amountsMatch ? "confirmed" : "awaiting_payee_confirmation",
        payer_amount_reported: amountReported,
        has_inconsistency: hasInconsistency,
        confirmed_at: amountsMatch ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("id", payment.id);

      await supabase.from("contracts").update({
        payment_status: amountsMatch ? "paid" : "awaiting_confirmation",
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      if (amountsMatch) {
        await settleActionRequest(id, "payment", "accepted", user.id);
      }

      await recordContractEvent({
        contractId: id,
        actorId: user.id,
        actorRole: getActorRole(contract, user.id),
        eventType: "payment_confirmed",
        metadata: { amount_reported: amountReported, role: "payer", match: amountsMatch },
      });

      if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });

      const otherPartyId = contract.person.profileId;
      const isHiring = contract.role === "hiring";
      const contractorId = isHiring ? userIdRef.current : (otherPartyId ?? null);
      const hiredId = isHiring ? (otherPartyId ?? null) : userIdRef.current;
      broadcastUpdate(id, contractorId, hiredId);

      if (otherPartyId) {
        const title = amountsMatch ? "Pagamento confirmado!" : "Confirme o pagamento";
        const body = amountsMatch
          ? "O pagamento em dinheiro foi confirmado pelas duas partes."
          : `${contract.person.name} informou o pagamento. Confirme o valor recebido.`;
        sendPushNotification(otherPartyId, title, body, { contract_id: id }, "payment").catch(() => {});
      }
    },
    [activeContracts, history, ensureCashPayment, loadContracts, sendPushNotification, broadcastUpdate]
  );

  // ── Reportar recebimento em dinheiro (contratado) ─────────────────────────────

  const reportCashReceived = useCallback(
    async (id: string, amountReceived: number, isIncomplete: boolean) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const contract = [...activeContracts, ...history].find((c) => c.id === id);
      if (!contract) throw new Error("Contrato não encontrado");
      if (contract.paymentMethod !== "dinheiro") throw new Error("Método não é dinheiro");

      const payment = await ensureCashPayment(contract, user.id);
      const audit = await getAuditSnapshot();

      await supabase.from("contract_payment_confirmations").upsert(
        {
          payment_id: payment.id,
          user_id: user.id,
          role: "payee",
          confirmation_type: isIncomplete ? "denied" : "received",
          amount_reported: amountReceived,
          is_incomplete: isIncomplete,
          ...audit,
        },
        { onConflict: "payment_id,user_id" }
      );

      const { data: payerConf } = await supabase
        .from("contract_payment_confirmations")
        .select("amount_reported")
        .eq("payment_id", payment.id)
        .eq("user_id", payment.payer_id)
        .maybeSingle();

      const payerAmount = payerConf?.amount_reported ?? null;
      const bothConfirmed = payerAmount !== null;
      const amountsMatch = bothConfirmed && !isIncomplete && Math.abs(amountReceived - payerAmount) < 0.02;
      const hasInconsistency = bothConfirmed && (!amountsMatch);

      await supabase.from("contract_payments").update({
        status: amountsMatch ? "confirmed" : "awaiting_payer_confirmation",
        payee_amount_reported: amountReceived,
        has_inconsistency: hasInconsistency,
        confirmed_at: amountsMatch ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq("id", payment.id);

      await supabase.from("contracts").update({
        payment_status: amountsMatch ? "paid" : "awaiting_confirmation",
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      if (amountsMatch) {
        await settleActionRequest(id, "payment", "accepted", user.id);
      }

      await recordContractEvent({
        contractId: id,
        actorId: user.id,
        actorRole: getActorRole(contract, user.id),
        eventType: "payment_confirmed",
        metadata: { amount_reported: amountReceived, role: "payee", is_incomplete: isIncomplete, match: amountsMatch },
      });

      if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });

      const otherPartyId = contract.person.profileId;
      const isHiring = contract.role === "hiring";
      const contractorId = isHiring ? userIdRef.current : (otherPartyId ?? null);
      const hiredId = isHiring ? (otherPartyId ?? null) : userIdRef.current;
      broadcastUpdate(id, contractorId, hiredId);

      if (otherPartyId) {
        const title = amountsMatch ? "Pagamento confirmado!" : "Confirme o pagamento";
        const body = amountsMatch
          ? "O pagamento em dinheiro foi confirmado pelas duas partes."
          : isIncomplete
          ? "O prestador informou que faltou parte do valor. Confira e confirme."
          : `${contract.person.name} informou o recebimento. Confirme o valor pago.`;
        sendPushNotification(otherPartyId, title, body, { contract_id: id }, "payment").catch(() => {});
      }
    },
    [activeContracts, history, ensureCashPayment, loadContracts, sendPushNotification, broadcastUpdate]
  );

  // ── Alterar método de pagamento ───────────────────────────────────────────────

  const changeContractPaymentMethod = useCallback(
    async (id: string, newMethod: "cartao" | "pix" | "saldo" | "dinheiro", cardLabel?: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const contract = [...activeContracts, ...history].find((c) => c.id === id);
      if (!contract) throw new Error("Contrato não encontrado");

      const methodMap: Record<string, string> = {
        cartao: "card",
        pix: "pix",
        saldo: "balance",
        dinheiro: "cash",
      };

      await supabase.from("contracts").update({
        payment_method: methodMap[newMethod] ?? newMethod,
        payment_card_label: newMethod === "cartao" ? (cardLabel ?? null) : null,
        payment_status: newMethod !== "dinheiro" ? "paid" : "pending",
        updated_at: new Date().toISOString(),
      }).eq("id", id);

      if (newMethod !== "dinheiro") {
        const { data: existing } = await supabase
          .from("contract_payments")
          .select("id")
          .eq("contract_id", id)
          .limit(1)
          .maybeSingle();

        const payerId = contract.role === "hiring" ? user.id : contract.person.profileId;
        const payeeId = contract.role === "hiring" ? contract.person.profileId : user.id;

        if (!existing && payerId && payeeId) {
          await supabase.from("contract_payments").insert({
            contract_id: id,
            payer_id: payerId,
            payee_id: payeeId,
            method: methodMap[newMethod] === "balance" ? "wallet_balance" : methodMap[newMethod],
            amount: contract.totalAmount ?? 0,
            status: "confirmed",
            requested_by: user.id,
            confirmed_at: new Date().toISOString(),
          });
        } else if (existing) {
          await supabase.from("contract_payments").update({
            method: methodMap[newMethod] === "balance" ? "wallet_balance" : methodMap[newMethod],
            status: "confirmed",
            confirmed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }).eq("id", existing.id);
        }
      }

      await recordContractEvent({
        contractId: id,
        actorId: user.id,
        actorRole: getActorRole(contract, user.id),
        eventType: "payment_confirmed",
        metadata: { new_method: newMethod, method_changed: true },
      });

      if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });

      const otherPartyId = contract.person.profileId;
      const isHiring = contract.role === "hiring";
      const contractorId = isHiring ? userIdRef.current : (otherPartyId ?? null);
      const hiredId = isHiring ? (otherPartyId ?? null) : userIdRef.current;
      broadcastUpdate(id, contractorId, hiredId);
    },
    [activeContracts, history, loadContracts, broadcastUpdate]
  );

  // ── Pagar valor pendente excedente (encerramento atrasado) ───────────────────
  const payPendingBalance = useCallback(
    async (contractId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const contract = [...activeContracts, ...history].find((c) => c.id === contractId);
      if (!contract) throw new Error("Contrato não encontrado");

      const pendingAmount = contract.pendingExtraAmount;
      if (!pendingAmount || pendingAmount <= 0) throw new Error("Nenhum valor pendente neste contrato");

      const { data: pendingPayment } = await supabase
        .from("contract_payments")
        .select("id, amount, method")
        .eq("contract_id", contractId)
        .eq("status", "pending_retry")
        .limit(1)
        .maybeSingle();

      if (!pendingPayment) throw new Error("Registro de pagamento pendente não encontrado");

      if (contract.paymentMethod === "saldo") {
        const payerId = contract.role === "hiring" ? user.id : contract.person.profileId;
        if (!payerId) throw new Error("Pagador não identificado");

        const { data: wallet } = await supabase
          .from("wallets")
          .select("id, balance")
          .eq("profile_id", payerId)
          .maybeSingle();

        if (!wallet || Number(wallet.balance) < pendingAmount) {
          throw new Error(`Saldo insuficiente. Disponível: ${formatCurrency(Number(wallet?.balance ?? 0))}`);
        }

        const prev = Number(wallet.balance);
        const newBalance = parseFloat((prev - pendingAmount).toFixed(2));
        await supabase.from("wallets").update({ balance: newBalance }).eq("id", wallet.id);
        await supabase.from("wallet_transactions").insert({
          wallet_id: wallet.id,
          profile_id: payerId,
          type: "payment",
          status: "completed",
          amount: pendingAmount,
          balance_before: prev,
          balance_after: newBalance,
          description: `Pagamento excedente – contrato #${contractId.slice(0, 8)}`,
          contract_id: contractId,
          
        });
      }

      await supabase.from("contract_payments").update({
        status: "confirmed",
        confirmed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", pendingPayment.id);

      await supabase.from("contracts").update({
        payment_status: "paid",
        pending_extra_amount: null,
        updated_at: new Date().toISOString(),
      }).eq("id", contractId);

      await recordContractEvent({
        contractId,
        actorId: user.id,
        actorRole: getActorRole(contract, user.id),
        eventType: "payment_confirmed",
        metadata: { pending_amount: pendingAmount, method: contract.paymentMethod },
      });

      if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });

      const otherPartyId = contract.person.profileId;
      const isHiring = contract.role === "hiring";
      const contractorId = isHiring ? userIdRef.current : (otherPartyId ?? null);
      const hiredId = isHiring ? (otherPartyId ?? null) : userIdRef.current;
      broadcastUpdate(contractId, contractorId, hiredId);
    },
    [activeContracts, history, loadContracts, broadcastUpdate]
  );

  const refreshContracts = useCallback(async () => {
    if (userIdRef.current)
      await loadContracts(userIdRef.current, { showLoading: false });
  }, [loadContracts]);

  return (
    <ContractsContext.Provider
      value={{
        activeContracts,
        history,
        isLoading,
        startContract,
        createDraftContract,
        processPaymentForDraftContract,
        finalizeContract,
        deleteDraftContract,
        markDeliveryAsSeen,
        acceptContract,
        rejectContract,
        beginContract,
        cancelContract,
        requestEndContract,
        confirmEndContract,
        rejectEndRequest,
        requestCancelContract,
        confirmCancelContract,
        rejectCancelRequest,
        confirmCashPayment,
        reportCashPaid,
        reportCashReceived,
        changeContractPaymentMethod,
        disputeCashPayment,
        payPendingBalance,
        refreshContracts,
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
