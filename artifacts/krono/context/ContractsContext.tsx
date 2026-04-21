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
import { createStripePaymentIntent, settleContractEnd } from "@/lib/stripeApi";
import { contractsApi } from "@/lib/contractsApi";

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

  // ── Helpers ──────────────────────────────────────────────────────────────────
    // Toda lógica/cálculo financeiro vive no backend (api-server).
    // Este contexto é uma casca: chama a API, refaz fetch e dispara
    // broadcasts/push notifications com os dados retornados.

    const findContract = useCallback(
      (id: string): Contract | undefined => {
        return [...activeContracts, ...history].find((c) => c.id === id);
      },
      [activeContracts, history]
    );

    const notifyParties = useCallback(
      (
        otherPartyId: string | null | undefined,
        selfId: string,
        payload: {
          otherTitle: string;
          otherBody: string;
          selfTitle: string;
          selfBody: string;
          contractId: string;
          category?: string;
          extraData?: Record<string, unknown>;
        },
      ) => {
        const data = { contract_id: payload.contractId, ...(payload.extraData ?? {}) };
        const cat = payload.category ?? "contract_updated";
        if (otherPartyId) {
          sendPushNotification(otherPartyId, payload.otherTitle, payload.otherBody, data, cat).catch(() => {});
        }
        sendPushNotification(selfId, payload.selfTitle, payload.selfBody, data, cat).catch(() => {});
      },
      [sendPushNotification]
    );

    const broadcastByContract = useCallback(
      (id: string, contractorId: string | null, hiredId: string | null) => {
        broadcastUpdate(id, contractorId, hiredId);
      },
      [broadcastUpdate]
    );

    // ── Criar contrato (modo direto) ──────────────────────────────────────────────

    const startContract = useCallback(
      async (
        contractData: Omit<Contract, "id" | "status" | "startedAt"> & {
          serviceId?: string;
        },
        initialStatus: "active" | "pending_signature" = "active"
      ): Promise<{ id: string; clientSecret?: string }> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const audit = await getAuditSnapshot();
        const result = await contractsApi.startNow(
          {
            hiredProfileId: contractData.person.profileId ?? user.id,
            type: contractData.tipo,
            ratePerHour: contractData.ratePerHour,
            duracaoTotalMs: contractData.duracaoTotal ?? null,
            serviceId: contractData.serviceId ?? contractData.servico?.serviceId ?? null,
            paymentMethod: contractData.paymentMethod ?? null,
            paymentCardLabel: contractData.paymentCardLabel ?? null,
            agendado: contractData.agendado ?? false,
            scheduledForMs: contractData.scheduledFor ?? null,
            location: contractData.location ?? null,
            distanceKm: contractData.person.distancia ?? null,
            initialStatus,
          },
          audit
        );

        let clientSecret: string | undefined;
        if (result.needsCardIntent && result.preAmount > 0 && result.payeeId) {
          const { data: { session } } = await supabase.auth.getSession();
          try {
            const intent = await createStripePaymentIntent({
              contractId: result.id,
              amount: result.preAmount,
              customerEmail: session?.user?.email,
              customerName: session?.user?.user_metadata?.name ?? contractData.person.name,
              payerProfileId: user.id,
              payeeProfileId: result.payeeId,
              metadata: { billing_trigger: "on_start" },
            });
            clientSecret = intent.clientSecret;
          } catch (err) {
            console.warn("[ContractsContext] PaymentIntent (on_start) error:", err);
          }
        }

        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });

        const hiredId = result.payeeId;
        if (hiredId && broadcastChannelRef.current && broadcastReadyRef.current) {
          broadcastChannelRef.current.send({
            type: "broadcast",
            event: "contract-created",
            payload: { hired_id: hiredId, contract_id: result.id },
          });
        }

        const serviceName = contractData.servico?.nome ?? contractData.servico?.skill ?? "serviço";
        notifyParties(hiredId, user.id, {
          otherTitle: "Nova contratação!",
          otherBody: `Você foi contratado para ${serviceName}.`,
          selfTitle: initialStatus === "active" ? "Contrato criado" : "Contrato enviado",
          selfBody: `Sua solicitação de ${serviceName} foi enviada.`,
          contractId: result.id,
          category: "contract_created",
        });

        return { id: result.id, clientSecret };
      },
      [loadContracts, notifyParties]
    );

    // ── Draft contract flow ───────────────────────────────────────────────────────

    const createDraftContract = useCallback(
      async (contractData: Omit<Contract, "id" | "status" | "startedAt" | "paymentStatus" | "billingTrigger" | "createdAt" | "endedAt" | "totalAmount" | "endReason" | "cancelReason" | "endRequestedBy" | "cancelRequestedBy" | "pendingExtraAmount" | "pendingRefundAmount"> & { serviceId?: string }) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const result = await contractsApi.createDraft({
          hiredProfileId: contractData.person.profileId ?? user.id,
          type: contractData.tipo,
          ratePerHour: contractData.ratePerHour ?? 0,
          duracaoTotalMs: contractData.duracaoTotal ?? null,
          serviceId: contractData.serviceId ?? null,
          paymentMethod: contractData.paymentMethod ?? null,
          paymentCardLabel: contractData.paymentCardLabel ?? null,
          agendado: contractData.agendado ?? false,
          scheduledForMs: contractData.scheduledFor ?? null,
          location: contractData.location ?? null,
        });
        return result;
      },
      []
    );

    const processPaymentForDraftContract = useCallback(
      async (
        contractId: string,
        params: { method: string; amount: number; pixPaymentIntentId?: string }
      ): Promise<{ clientSecret?: string }> => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        let clientSecret: string | undefined;
        let stripePaymentIntentId: string | undefined;

        // For card payments, create the Stripe intent first (the backend just
        // records the payment row with the intent id).
        if (params.method === "cartao" && params.amount > 0) {
          const { data: row } = await supabase
            .from("contracts")
            .select("hired_id")
            .eq("id", contractId)
            .single();
          const hiredId = row?.hired_id ?? "";
          const intent = await createStripePaymentIntent({
            contractId,
            amount: params.amount,
            payerProfileId: user.id,
            payeeProfileId: hiredId,
          });
          clientSecret = intent.clientSecret;
          stripePaymentIntentId = intent.paymentIntentId;
        }

        await contractsApi.processPayment(contractId, {
          method: params.method,
          amount: params.amount,
          stripePaymentIntentId,
          pixPaymentIntentId: params.pixPaymentIntentId,
        });

        return { clientSecret };
      },
      []
    );

    const finalizeContract = useCallback(
      async (contractId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const audit = await getAuditSnapshot();
        const result = await contractsApi.finalize(contractId, audit);

        if (broadcastChannelRef.current && broadcastReadyRef.current) {
          broadcastChannelRef.current.send({
            type: "broadcast",
            event: "contract-created",
            payload: { hired_id: result.hiredId, contract_id: contractId },
          });
        }

        notifyParties(result.hiredId, user.id, {
          otherTitle: "Nova contratação!",
          otherBody: `Você foi contratado para ${result.serviceName}.`,
          selfTitle: "Contrato enviado",
          selfBody: `Sua solicitação de ${result.serviceName} foi enviada.`,
          contractId,
          category: "contract_created",
        });

        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });
      },
      [loadContracts, notifyParties]
    );

    const deleteDraftContract = useCallback(async (contractId: string) => {
      await contractsApi.deleteDraft(contractId);
    }, []);

    const markDeliveryAsSeen = useCallback(async (contractId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const now = new Date().toISOString();
      await supabase
        .from("contract_deliveries")
        .update({ status: "seen", seen_at: now })
        .eq("contract_id", contractId)
        .eq("recipient_id", user.id)
        .neq("status", "seen");
    }, []);

    // ── Aceitar / Recusar / Iniciar / Cancelar ────────────────────────────────────

    const acceptContract = useCallback(
      async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");
        const audit = await getAuditSnapshot();
        const parties = await contractsApi.accept(id, audit);
        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });
        broadcastByContract(id, parties.contractorId, parties.hiredId);
        notifyParties(parties.contractorId, user.id, {
          otherTitle: "Contrato aceito!",
          otherBody: "O prestador aceitou sua solicitação.",
          selfTitle: "Contrato aceito",
          selfBody: "Você aceitou o contrato. Aguarde o início.",
          contractId: id,
          category: "contract_accepted",
        });
      },
      [loadContracts, notifyParties, broadcastByContract]
    );

    const rejectContract = useCallback(
      async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");
        const audit = await getAuditSnapshot();
        const parties = await contractsApi.reject(id, audit);
        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });
        broadcastByContract(id, parties.contractorId, parties.hiredId);
        notifyParties(parties.contractorId, user.id, {
          otherTitle: "Contrato recusado",
          otherBody: "O prestador recusou sua solicitação de contrato.",
          selfTitle: "Contrato recusado",
          selfBody: "Você recusou esta solicitação de contrato.",
          contractId: id,
          category: "contract_cancelled",
        });
      },
      [loadContracts, notifyParties, broadcastByContract]
    );

    const beginContract = useCallback(
      async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");
        const audit = await getAuditSnapshot();
        const parties = await contractsApi.begin(id, audit);
        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });
        broadcastByContract(id, parties.contractorId, parties.hiredId);
        notifyParties(parties.contractorId, user.id, {
          otherTitle: "Serviço iniciado!",
          otherBody: "O prestador começou a trabalhar no seu contrato.",
          selfTitle: "Serviço iniciado",
          selfBody: "Você iniciou o trabalho. Bom serviço!",
          contractId: id,
          category: "contract_started",
        });
      },
      [loadContracts, notifyParties, broadcastByContract]
    );

    const cancelContract = useCallback(
      async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const audit = await getAuditSnapshot();
        const parties = await contractsApi.cancelNow(id, audit);
        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });
        broadcastByContract(id, parties.contractorId, parties.hiredId);

        const contract = findContract(id);
        const otherPartyId = contract?.person.profileId;
        const isHiring = contract?.role === "hiring";
        notifyParties(otherPartyId, user.id, {
          otherTitle: "Contrato cancelado",
          otherBody: isHiring
            ? "O contratante cancelou o contrato."
            : "O prestador cancelou o contrato.",
          selfTitle: "Contrato cancelado",
          selfBody: "Você cancelou o contrato.",
          contractId: id,
          category: "contract_cancelled",
        });
      },
      [findContract, loadContracts, notifyParties, broadcastByContract]
    );

    // ── Encerramento ──────────────────────────────────────────────────────────────

    const requestEndContract = useCallback(
      async (id: string, reason: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");
        const audit = await getAuditSnapshot();
        const parties = await contractsApi.requestEnd(id, reason, audit);
        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });
        broadcastByContract(id, parties.contractorId, parties.hiredId);
        const contract = findContract(id);
        const isHiring = contract?.role === "hiring";
        notifyParties(contract?.person.profileId, user.id, {
          otherTitle: "Solicitação de encerramento",
          otherBody: `${isHiring ? "O contratante" : "O prestador"} solicitou encerrar o contrato. Motivo: ${reason}`,
          selfTitle: "Encerramento solicitado",
          selfBody: "Sua solicitação de encerramento foi enviada. Aguardando confirmação da contraparte.",
          contractId: id,
          category: "contract_ended",
        });
      },
      [findContract, loadContracts, notifyParties, broadcastByContract]
    );

    // O encerramento real (cálculo proporcional + reembolsos/excedentes) acontece
    // 100% no backend (api-server: POST /api/contracts/:id/end via settleContractEnd).
    const confirmEndContract = useCallback(
      async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");

        const contract = findContract(id);
        if (!contract) throw new Error("Contrato não encontrado");
        const reason = contract.endReason ?? "Encerrado com acordo mútuo";
        const settlement = await settleContractEnd(id, reason);

        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });

        const otherPartyId = contract.person.profileId;
        const isHiring = contract.role === "hiring";
        const contractorId = isHiring ? userIdRef.current : (otherPartyId ?? null);
        const hiredId = isHiring ? (otherPartyId ?? null) : userIdRef.current;
        broadcastByContract(id, contractorId, hiredId);

        const amountLabel = formatCurrency(settlement.realAmount);
        const extraLabel = settlement.pendingExtraAmount
          ? ` Valor extra pendente: ${formatCurrency(settlement.pendingExtraAmount)}.`
          : "";
        const refundLabel = settlement.pendingRefundAmount
          ? ` Reembolso de ${formatCurrency(settlement.pendingRefundAmount)} processado.`
          : "";

        notifyParties(otherPartyId, user.id, {
          otherTitle: "Contrato encerrado",
          otherBody: `Contrato encerrado. Valor: ${amountLabel}.${extraLabel}${refundLabel}`,
          selfTitle: "Contrato encerrado",
          selfBody: `Você confirmou o encerramento. Valor: ${amountLabel}.${extraLabel}${refundLabel}`,
          contractId: id,
          category: "contract_ended",
        });

        return {};
      },
      [findContract, loadContracts, notifyParties, broadcastByContract]
    );

    const rejectEndRequest = useCallback(
      async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");
        const audit = await getAuditSnapshot();
        const parties = await contractsApi.rejectEnd(id, audit);
        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });
        broadcastByContract(id, parties.contractorId, parties.hiredId);
        const contract = findContract(id);
        if (contract?.person.profileId) {
          sendPushNotification(
            contract.person.profileId,
            "Encerramento recusado",
            "A outra parte recusou o encerramento. O contrato continua ativo.",
            { contract_id: id },
            "contract_updated"
          ).catch(() => {});
        }
      },
      [findContract, loadContracts, sendPushNotification, broadcastByContract]
    );

    // ── Cancelamento (após iniciado) ──────────────────────────────────────────────

    const requestCancelContract = useCallback(
      async (id: string, reason: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");
        const audit = await getAuditSnapshot();
        const parties = await contractsApi.requestCancel(id, reason, audit);
        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });
        broadcastByContract(id, parties.contractorId, parties.hiredId);
        const contract = findContract(id);
        const isHiring = contract?.role === "hiring";
        notifyParties(contract?.person.profileId, user.id, {
          otherTitle: "Solicitação de cancelamento",
          otherBody: `${isHiring ? "O contratante" : "O prestador"} quer cancelar o contrato. Motivo: ${reason}`,
          selfTitle: "Cancelamento solicitado",
          selfBody: "Sua solicitação de cancelamento foi enviada. Aguardando confirmação.",
          contractId: id,
          category: "contract_cancelled",
        });
      },
      [findContract, loadContracts, notifyParties, broadcastByContract]
    );

    const confirmCancelContract = useCallback(
      async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");
        const contract = findContract(id);
        const reason = contract?.cancelReason ?? "Cancelado com acordo mútuo";
        const audit = await getAuditSnapshot();
        const parties = await contractsApi.confirmCancel(id, reason, audit);
        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });
        broadcastByContract(id, parties.contractorId, parties.hiredId);
        notifyParties(contract?.person.profileId, user.id, {
          otherTitle: "Contrato cancelado",
          otherBody: `Contrato cancelado. Motivo: ${reason}.`,
          selfTitle: "Contrato cancelado",
          selfBody: "Você confirmou o cancelamento do contrato.",
          contractId: id,
          category: "contract_cancelled",
        });
      },
      [findContract, loadContracts, notifyParties, broadcastByContract]
    );

    const rejectCancelRequest = useCallback(
      async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");
        const contract = findContract(id);
        const audit = await getAuditSnapshot();
        const parties = await contractsApi.rejectCancel(id, contract?.cancelReason, audit);
        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });
        broadcastByContract(id, parties.contractorId, parties.hiredId);
        if (contract?.person.profileId) {
          sendPushNotification(
            contract.person.profileId,
            "Cancelamento recusado",
            "A outra parte recusou o cancelamento. O contrato continua ativo.",
            { contract_id: id },
            "contract_updated"
          ).catch(() => {});
        }
      },
      [findContract, loadContracts, sendPushNotification, broadcastByContract]
    );

    // ── Pagamentos em dinheiro ────────────────────────────────────────────────────

    const confirmCashPayment = useCallback(
      async (id: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");
        const contract = findContract(id);
        if (!contract) throw new Error("Contrato não encontrado");
        if (contract.paymentMethod !== "dinheiro") {
          throw new Error("Este contrato não usa pagamento em dinheiro");
        }
        const audit = await getAuditSnapshot();
        const result = await contractsApi.confirmCash(id, audit);
        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });
        broadcastByContract(id, result.contractorId, result.hiredId);
        const otherPartyId = contract.person.profileId;
        if (otherPartyId) {
          sendPushNotification(
            otherPartyId,
            result.confirmed ? "Pagamento confirmado" : "Confirmação de pagamento",
            result.confirmed
              ? "O pagamento em dinheiro foi confirmado pelas duas partes."
              : "A outra parte confirmou o pagamento em dinheiro. Confirme também para concluir.",
            { contract_id: id, payment_id: result.paymentId },
            "payment"
          ).catch(() => {});
        }
      },
      [findContract, loadContracts, sendPushNotification, broadcastByContract]
    );

    const disputeCashPayment = useCallback(
      async (id: string, reason = "Pagamento em dinheiro contestado") => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");
        const contract = findContract(id);
        if (!contract) throw new Error("Contrato não encontrado");
        if (contract.paymentMethod !== "dinheiro") {
          throw new Error("Este contrato não usa pagamento em dinheiro");
        }
        const audit = await getAuditSnapshot();
        const result = await contractsApi.disputeCash(id, reason, audit);
        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });
        broadcastByContract(id, result.contractorId, result.hiredId);
        if (result.againstUserId) {
          sendPushNotification(
            result.againstUserId,
            "Pagamento contestado",
            "A outra parte abriu uma disputa sobre o pagamento em dinheiro.",
            { contract_id: id, payment_id: result.paymentId },
            "payment"
          ).catch(() => {});
        }
      },
      [findContract, loadContracts, sendPushNotification, broadcastByContract]
    );

    const reportCashPaid = useCallback(
      async (id: string, amountReported: number) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");
        const contract = findContract(id);
        if (!contract) throw new Error("Contrato não encontrado");
        if (contract.paymentMethod !== "dinheiro") throw new Error("Método não é dinheiro");
        const audit = await getAuditSnapshot();
        const result = await contractsApi.cashPaid(id, amountReported, audit);
        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });
        broadcastByContract(id, result.contractorId, result.hiredId);
        const otherPartyId = contract.person.profileId;
        if (otherPartyId) {
          const title = result.amountsMatch ? "Pagamento confirmado!" : "Confirme o pagamento";
          const body = result.amountsMatch
            ? "O pagamento em dinheiro foi confirmado pelas duas partes."
            : `${contract.person.name} informou o pagamento. Confirme o valor recebido.`;
          sendPushNotification(otherPartyId, title, body, { contract_id: id }, "payment").catch(() => {});
        }
      },
      [findContract, loadContracts, sendPushNotification, broadcastByContract]
    );

    const reportCashReceived = useCallback(
      async (id: string, amountReceived: number, isIncomplete: boolean) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");
        const contract = findContract(id);
        if (!contract) throw new Error("Contrato não encontrado");
        if (contract.paymentMethod !== "dinheiro") throw new Error("Método não é dinheiro");
        const audit = await getAuditSnapshot();
        const result = await contractsApi.cashReceived(id, amountReceived, isIncomplete, audit);
        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });
        broadcastByContract(id, result.contractorId, result.hiredId);
        const otherPartyId = contract.person.profileId;
        if (otherPartyId) {
          const title = result.amountsMatch ? "Pagamento confirmado!" : "Confirme o pagamento";
          const body = result.amountsMatch
            ? "O pagamento em dinheiro foi confirmado pelas duas partes."
            : isIncomplete
            ? "O prestador informou que faltou parte do valor. Confira e confirme."
            : `${contract.person.name} informou o recebimento. Confirme o valor pago.`;
          sendPushNotification(otherPartyId, title, body, { contract_id: id }, "payment").catch(() => {});
        }
      },
      [findContract, loadContracts, sendPushNotification, broadcastByContract]
    );

    // ── Trocar método de pagamento ────────────────────────────────────────────────

    const changeContractPaymentMethod = useCallback(
      async (id: string, newMethod: "cartao" | "pix" | "saldo" | "dinheiro", cardLabel?: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");
        const audit = await getAuditSnapshot();
        const parties = await contractsApi.changePaymentMethod(id, newMethod, cardLabel, audit);
        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });
        broadcastByContract(id, parties.contractorId, parties.hiredId);
      },
      [loadContracts, broadcastByContract]
    );

    // ── Pagar valor pendente excedente ────────────────────────────────────────────

    const payPendingBalance = useCallback(
      async (contractId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Usuário não autenticado");
        const audit = await getAuditSnapshot();
        const parties = await contractsApi.payPending(contractId, audit);
        if (userIdRef.current) await loadContracts(userIdRef.current, { showLoading: false });
        broadcastByContract(contractId, parties.contractorId, parties.hiredId);
      },
      [loadContracts, broadcastByContract]
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
