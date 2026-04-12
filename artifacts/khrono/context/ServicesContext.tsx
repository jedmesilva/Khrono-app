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
  valorBase: number;
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

function iconForType(tipo: string): "truck" | "tool" | "box" {
  const t = (tipo ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (t === "veiculo") return "truck";
  if (t === "ferramenta") return "tool";
  return "box";
}

function mapRowToService(row: any, valorBase: number): Service {
  const rawTools: any[] = Array.isArray(row.tools) ? row.tools : [];
  const toolIds = rawTools
    .map((t: any) => (typeof t === "string" ? t : t.nome ?? ""))
    .filter(Boolean);

  return {
    id: row.id,
    name: row.nome,
    skillId: row.skill ?? "",
    toolIds,
    rating: Number(row.nota ?? 0),
    reviews: Number(row.avaliacoes ?? 0),
    contracts: Number(row.avaliacoes ?? 0),
    hourlyRate: Math.round(Number(valorBase) * Number(row.multiplicador ?? 1)),
    isNew: Number(row.avaliacoes ?? 0) === 0,
    active: Boolean(row.is_active),
    verified: null,
    addedAt: formatMonthYear(row.created_at),
    reviewsList: [],
    contractsList: [],
  };
}

function aggregateTools(serviceRows: any[]): Tool[] {
  const seen = new Set<string>();
  const tools: Tool[] = [];
  for (const sv of serviceRows) {
    const rawTools: any[] = Array.isArray(sv.tools) ? sv.tools : [];
    for (const t of rawTools) {
      const nome = typeof t === "string" ? t : (t.nome ?? "");
      const tipo = typeof t === "string" ? "" : (t.tipo ?? "");
      if (nome && !seen.has(nome)) {
        seen.add(nome);
        tools.push({
          id: nome,
          name: nome,
          type: tipo || "Ferramenta",
          icon: iconForType(tipo),
          details: "",
          available: true,
          verified: null,
          addedAt: formatMonthYear(sv.created_at),
        });
      }
    }
  }
  return tools;
}

interface ServicesContextType {
  myServices: Service[];
  myTools: Tool[];
  providerProfile: ProviderProfileStats | null;
  isLoading: boolean;
  isActive: (id: string) => boolean;
  toggleActive: (id: string) => Promise<void>;
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
      const [servicesRes, ppRes] = await Promise.all([
        supabase
          .from("provider_services")
          .select("*")
          .eq("profile_id", userId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false }),
        supabase
          .from("provider_profiles")
          .select("*")
          .eq("profile_id", userId)
          .single(),
      ]);

      const valorBase = ppRes.data ? Number(ppRes.data.valor_base ?? 50) : 50;

      if (ppRes.data) {
        setProviderProfile({
          valorBase,
          nota: Number(ppRes.data.nota ?? 0),
          avaliacoes: Number(ppRes.data.avaliacoes ?? 0),
          totalContracts: Number(ppRes.data.total_contracts ?? 0),
          verified: Boolean(ppRes.data.verified),
        });
      }

      if (servicesRes.data) {
        const rows = servicesRes.data;
        setMyServices(rows.map((row) => mapRowToService(row, valorBase)));
        setMyTools(aggregateTools(rows));
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

  const refresh = useCallback(async () => {
    if (userIdRef.current) await loadData(userIdRef.current);
  }, [loadData]);

  return (
    <ServicesContext.Provider
      value={{ myServices, myTools, providerProfile, isLoading, isActive, toggleActive, refresh }}
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
