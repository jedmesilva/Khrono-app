import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import type { Service, Tool, VerificationType } from "@/constants/profile-data";

export type ProviderProfileStats = {
  nota: number;
  avaliacoes: number;
  totalContracts: number;
  verified: boolean;
};

export function formatMonthYear(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function iconForTipo(tipo: string): "truck" | "tool" | "box" {
  const t = (tipo ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (t === "veiculo") return "truck";
  if (t === "ferramenta") return "tool";
  return "box";
}

function mapRowToService(row: any, contractsCount: number): Service {
  const skillIds: string[] = (row.service_skills ?? []).map((ss: any) => ss.skill_id as string);
  const toolIds: string[] = (row.service_tools ?? []).map((st: any) => st.tool_id as string);

  return {
    id: row.id,
    name: row.nome,
    skillIds,
    toolIds,
    rating: Number(row.nota ?? 0),
    reviews: Number(row.avaliacoes ?? 0),
    contracts: contractsCount,
    hourlyRate: Number(row.valor_hora ?? 50),
    isNew: contractsCount < 10,
    active: Boolean(row.is_active),
    verified: null,
    addedAt: formatMonthYear(row.created_at),
    reviewsList: [],
    contractsList: [],
  };
}

function mapRowToTool(row: any): Tool {
  const vs = row.verification_status as "unverified" | "pending" | "verified" | undefined;
  return {
    id: row.id,
    name: row.nome,
    type: row.tipo ?? "equipamento",
    icon: iconForTipo(row.tipo),
    details: row.details ?? "",
    available: Boolean(row.is_available),
    verified: vs === "verified" ? { type: "documentation" as VerificationType } : null,
    addedAt: formatMonthYear(row.created_at),
    brand: row.brand ?? undefined,
    model: row.model ?? undefined,
    year: row.manufacture_year ?? undefined,
    verificationStatus: vs ?? "unverified",
  };
}

interface ServicesContextType {
  myServices: Service[];
  myTools: Tool[];
  providerProfile: ProviderProfileStats | null;
  isLoading: boolean;
  isActive: (id: string) => boolean;
  toggleActive: (id: string) => Promise<void>;
  toggleToolAvailable: (id: string, available: boolean) => Promise<void>;
  removeTool: (id: string) => Promise<void>;
  requestToolVerification: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const ServicesContext = createContext<ServicesContextType | null>(null);

export function ServicesProvider({ children }: { children: React.ReactNode }) {
  const [myServices, setMyServices] = useState<Service[]>([]);
  const [myTools, setMyTools] = useState<Tool[]>([]);
  const [providerProfile, setProviderProfile] = useState<ProviderProfileStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userIdRef = useRef<string | null>(null);

  const loadData = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const [servicesRes, ppRes, contractsRes, toolsRes] = await Promise.all([
        supabase
          .from("provider_services")
          .select(`
            *,
            service_skills(skill_id),
            service_tools(tool_id)
          `)
          .eq("profile_id", userId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false }),
        supabase
          .from("provider_profiles")
          .select("*")
          .eq("profile_id", userId)
          .single(),
        supabase
          .from("contracts")
          .select("service_id")
          .eq("hired_id", userId)
          .not("service_id", "is", null),
        supabase
          .from("provider_tools")
          .select("*")
          .eq("profile_id", userId)
          .order("created_at", { ascending: false }),
      ]);

      if (ppRes.data) {
        setProviderProfile({
          nota: Number(ppRes.data.nota ?? 0),
          avaliacoes: Number(ppRes.data.avaliacoes ?? 0),
          totalContracts: Number(ppRes.data.total_contracts ?? 0),
          verified: Boolean(ppRes.data.verified),
        });
      }

      const contractsCountMap: Record<string, number> = {};
      if (contractsRes.data) {
        for (const c of contractsRes.data) {
          if (c.service_id) {
            contractsCountMap[c.service_id] = (contractsCountMap[c.service_id] ?? 0) + 1;
          }
        }
      }

      if (servicesRes.data) {
        setMyServices(
          servicesRes.data.map((row) =>
            mapRowToService(row, contractsCountMap[row.id] ?? 0)
          )
        );
      }

      if (toolsRes.data) {
        setMyTools(toolsRes.data.map(mapRowToTool));
      }
    } catch (e) {
      console.warn("[ServicesContext] loadData error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        userIdRef.current = user.id;
        loadData(user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        userIdRef.current = session.user.id;
        loadData(session.user.id);
      } else {
        userIdRef.current = null;
        setMyServices([]);
        setMyTools([]);
        setProviderProfile(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadData]);

  const isActive = useCallback(
    (id: string) => {
      const sv = myServices.find((s) => s.id === id);
      return sv ? sv.active : true;
    },
    [myServices]
  );

  const toggleActive = useCallback(
    async (id: string) => {
      const sv = myServices.find((s) => s.id === id);
      if (!sv) return;
      const newActive = !sv.active;
      setMyServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, active: newActive } : s))
      );
      await supabase
        .from("provider_services")
        .update({ is_active: newActive })
        .eq("id", id);
    },
    [myServices]
  );

  const toggleToolAvailable = useCallback(async (id: string, available: boolean) => {
    setMyTools((prev) => prev.map((t) => (t.id === id ? { ...t, available } : t)));
    await supabase.from("provider_tools").update({ is_available: available }).eq("id", id);
  }, []);

  const removeTool = useCallback(async (id: string) => {
    setMyTools((prev) => prev.filter((t) => t.id !== id));
    await supabase.from("provider_tools").delete().eq("id", id);
  }, []);

  const requestToolVerification = useCallback(async (id: string) => {
    setMyTools((prev) =>
      prev.map((t) => (t.id === id ? { ...t, verificationStatus: "pending" as const } : t))
    );
    await supabase
      .from("provider_tools")
      .update({ verification_status: "pending" })
      .eq("id", id);
  }, []);

  const refresh = useCallback(async () => {
    if (userIdRef.current) await loadData(userIdRef.current);
  }, [loadData]);

  return (
    <ServicesContext.Provider
      value={{ myServices, myTools, providerProfile, isLoading, isActive, toggleActive, toggleToolAvailable, removeTool, requestToolVerification, refresh }}
    >
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices() {
  const ctx = useContext(ServicesContext);
  if (!ctx) throw new Error("useServices must be used within ServicesProvider");
  return ctx;
}
