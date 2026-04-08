import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import type { CatalogSkill, CatalogService } from "./CatalogContext";

export type UserSkillEntry = {
  id: string;
  skill_id: string;
  skill: CatalogSkill;
};

export type UserServiceEntry = {
  id: string;
  service_id: string;
  service: CatalogService;
};

type UserCatalogContextType = {
  userSkills: UserSkillEntry[];
  userServices: UserServiceEntry[];
  isLoading: boolean;
  addSkill: (skillId: string) => Promise<void>;
  removeSkill: (skillId: string) => Promise<void>;
  addService: (serviceId: string) => Promise<void>;
  removeService: (serviceId: string) => Promise<void>;
  hasSkill: (skillId: string) => boolean;
  hasService: (serviceId: string) => boolean;
};

const UserCatalogContext = createContext<UserCatalogContextType | null>(null);

export function UserCatalogProvider({ children }: { children: React.ReactNode }) {
  const [userSkills, setUserSkills] = useState<UserSkillEntry[]>([]);
  const [userServices, setUserServices] = useState<UserServiceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const loadUserCatalog = useCallback(async (uid: string) => {
    const [skillsRes, servicesRes] = await Promise.all([
      supabase
        .from("user_skills")
        .select("id, skill_id, skill:skills_catalog(*)")
        .eq("profile_id", uid),
      supabase
        .from("user_services")
        .select("id, service_id, service:services_catalog(*)")
        .eq("profile_id", uid),
    ]);

    if (skillsRes.data) {
      setUserSkills(
        skillsRes.data.map((row: any) => ({
          id: row.id,
          skill_id: row.skill_id,
          skill: row.skill as CatalogSkill,
        }))
      );
    }
    if (servicesRes.data) {
      setUserServices(
        servicesRes.data.map((row: any) => ({
          id: row.id,
          service_id: row.service_id,
          service: row.service as CatalogService,
        }))
      );
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        loadUserCatalog(user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        loadUserCatalog(session.user.id);
      } else {
        setUserId(null);
        setUserSkills([]);
        setUserServices([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserCatalog]);

  const addSkill = useCallback(async (skillId: string) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("user_skills")
      .insert({ profile_id: userId, skill_id: skillId })
      .select("id, skill_id, skill:skills_catalog(*)")
      .single();

    if (!error && data) {
      setUserSkills((prev) => [
        ...prev,
        { id: data.id, skill_id: data.skill_id, skill: (data as any).skill },
      ]);
    }
  }, [userId]);

  const removeSkill = useCallback(async (skillId: string) => {
    if (!userId) return;
    await supabase
      .from("user_skills")
      .delete()
      .eq("profile_id", userId)
      .eq("skill_id", skillId);
    setUserSkills((prev) => prev.filter((s) => s.skill_id !== skillId));
  }, [userId]);

  const addService = useCallback(async (serviceId: string) => {
    if (!userId) return;
    const { data, error } = await supabase
      .from("user_services")
      .insert({ profile_id: userId, service_id: serviceId })
      .select("id, service_id, service:services_catalog(*)")
      .single();

    if (!error && data) {
      setUserServices((prev) => [
        ...prev,
        { id: data.id, service_id: data.service_id, service: (data as any).service },
      ]);
    }
  }, [userId]);

  const removeService = useCallback(async (serviceId: string) => {
    if (!userId) return;
    await supabase
      .from("user_services")
      .delete()
      .eq("profile_id", userId)
      .eq("service_id", serviceId);
    setUserServices((prev) => prev.filter((s) => s.service_id !== serviceId));
  }, [userId]);

  const hasSkill = useCallback(
    (skillId: string) => userSkills.some((s) => s.skill_id === skillId),
    [userSkills]
  );

  const hasService = useCallback(
    (serviceId: string) => userServices.some((s) => s.service_id === serviceId),
    [userServices]
  );

  return (
    <UserCatalogContext.Provider
      value={{ userSkills, userServices, isLoading, addSkill, removeSkill, addService, removeService, hasSkill, hasService }}
    >
      {children}
    </UserCatalogContext.Provider>
  );
}

export function useUserCatalog() {
  const ctx = useContext(UserCatalogContext);
  if (!ctx) throw new Error("useUserCatalog must be used within UserCatalogProvider");
  return ctx;
}
