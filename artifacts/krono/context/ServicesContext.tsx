import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { profileApi, type ProviderServiceDTO, type ProviderToolDTO } from "@/lib/profileApi";
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
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

function iconForTipo(tipo: string): "truck" | "tool" | "box" {
  const t = (tipo ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (t === "veiculo") return "truck";
  if (t === "ferramenta") return "tool";
  return "box";
}

function dtoToService(dto: ProviderServiceDTO): Service {
  return {
    id: dto.id,
    name: dto.nome,
    skillIds: dto.skillIds,
    toolIds: dto.toolIds,
    rating: dto.rating,
    reviews: dto.reviews,
    contracts: 0,
    hourlyRate: dto.hourlyRate,
    isNew: dto.reviews === 0,
    active: dto.isActive,
    verified: dto.isVerified ? { type: "documentation" as VerificationType } : null,
    addedAt: formatMonthYear(dto.createdAt),
    reviewsList: [],
    contractsList: [],
  };
}

function dtoToTool(dto: ProviderToolDTO): Tool {
  return {
    id: dto.id,
    name: dto.nome,
    type: dto.tipo,
    icon: iconForTipo(dto.tipo),
    details: dto.details,
    available: dto.available,
    verified:
      dto.verificationStatus === "verified"
        ? { type: "documentation" as VerificationType }
        : null,
    addedAt: formatMonthYear(dto.createdAt),
    brand: dto.brand ?? undefined,
    model: dto.model ?? undefined,
    year: dto.manufactureYear ?? undefined,
    verificationStatus: dto.verificationStatus,
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

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [services, tools, profileBundle] = await Promise.all([
        profileApi.listServices(),
        profileApi.listTools(),
        profileApi.get(),
      ]);
      setMyServices(services.map(dtoToService));
      setMyTools(tools.map(dtoToTool));
      setProviderProfile(profileBundle.providerProfile ?? null);
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
        loadData();
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        userIdRef.current = session.user.id;
        loadData();
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
    [myServices],
  );

  const toggleActive = useCallback(
    async (id: string) => {
      const sv = myServices.find((s) => s.id === id);
      if (!sv) return;
      const newActive = !sv.active;
      setMyServices((prev) =>
        prev.map((s) => (s.id === id ? { ...s, active: newActive } : s)),
      );
      try {
        await profileApi.updateService(id, { isActive: newActive });
      } catch (e) {
        console.warn("[ServicesContext] toggleActive error:", e);
      }
    },
    [myServices],
  );

  const toggleToolAvailable = useCallback(async (id: string, available: boolean) => {
    setMyTools((prev) => prev.map((t) => (t.id === id ? { ...t, available } : t)));
    try {
      await profileApi.updateTool(id, { isAvailable: available });
    } catch (e) {
      console.warn("[ServicesContext] toggleToolAvailable error:", e);
    }
  }, []);

  const removeTool = useCallback(async (id: string) => {
    setMyTools((prev) => prev.filter((t) => t.id !== id));
    try {
      await profileApi.deleteTool(id);
    } catch (e) {
      console.warn("[ServicesContext] removeTool error:", e);
    }
  }, []);

  const requestToolVerification = useCallback(async (id: string) => {
    setMyTools((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, verificationStatus: "pending" as const } : t,
      ),
    );
    try {
      await profileApi.updateTool(id, { verificationStatus: "pending" });
    } catch (e) {
      console.warn("[ServicesContext] requestToolVerification error:", e);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (userIdRef.current) await loadData();
  }, [loadData]);

  return (
    <ServicesContext.Provider
      value={{
        myServices,
        myTools,
        providerProfile,
        isLoading,
        isActive,
        toggleActive,
        toggleToolAvailable,
        removeTool,
        requestToolVerification,
        refresh,
      }}
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
