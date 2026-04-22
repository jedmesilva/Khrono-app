import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import { profileApi } from "@/lib/profileApi";
import type { CatalogSkill, CatalogService } from "./CatalogContext";

export type UserSkillEntry = {
  id: string;
  skill_id: string;
  createdAt: string;
  isActive: boolean;
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
  toggleSkillActive: (entryId: string, isActive: boolean) => Promise<void>;
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

  const loadUserCatalog = useCallback(async () => {
    try {
      const [skills, services] = await Promise.all([
        profileApi.listUserSkills(),
        profileApi.listUserServices(),
      ]);
      setUserSkills(
        skills.map((s) => ({
          id: s.id,
          skill_id: s.skillId,
          createdAt: s.createdAt ?? "",
          isActive: s.isActive,
          skill: s.skill as CatalogSkill,
        })),
      );
      setUserServices(
        services.map((s) => ({
          id: s.id,
          service_id: s.serviceId,
          service: s.service as CatalogService,
        })),
      );
    } catch (e) {
      console.warn("[UserCatalog] load error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        loadUserCatalog();
      } else {
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        loadUserCatalog();
      } else {
        setUserId(null);
        setUserSkills([]);
        setUserServices([]);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserCatalog]);

  const addSkill = useCallback(
    async (skillId: string) => {
      if (!userId) return;
      try {
        const entry = await profileApi.addUserSkill(skillId);
        setUserSkills((prev) => [
          ...prev,
          {
            id: entry.id,
            skill_id: entry.skillId,
            createdAt: entry.createdAt ?? "",
            isActive: entry.isActive,
            skill: entry.skill as CatalogSkill,
          },
        ]);
      } catch (e) {
        console.warn("[UserCatalog] addSkill error:", e);
      }
    },
    [userId],
  );

  const toggleSkillActive = useCallback(async (entryId: string, isActive: boolean) => {
    setUserSkills((prev) =>
      prev.map((s) => (s.id === entryId ? { ...s, isActive } : s)),
    );
    try {
      await profileApi.setUserSkillActive(entryId, isActive);
    } catch (e) {
      console.warn("[UserCatalog] toggleSkillActive error:", e);
    }
  }, []);

  const removeSkill = useCallback(
    async (skillId: string) => {
      if (!userId) return;
      try {
        await profileApi.removeUserSkill(skillId);
        setUserSkills((prev) => prev.filter((s) => s.skill_id !== skillId));
      } catch (e) {
        console.warn("[UserCatalog] removeSkill error:", e);
      }
    },
    [userId],
  );

  const addService = useCallback(
    async (serviceId: string) => {
      if (!userId) return;
      try {
        const entry = await profileApi.addUserService(serviceId);
        setUserServices((prev) => [
          ...prev,
          {
            id: entry.id,
            service_id: entry.serviceId,
            service: entry.service as CatalogService,
          },
        ]);
      } catch (e) {
        console.warn("[UserCatalog] addService error:", e);
      }
    },
    [userId],
  );

  const removeService = useCallback(
    async (serviceId: string) => {
      if (!userId) return;
      try {
        await profileApi.removeUserService(serviceId);
        setUserServices((prev) => prev.filter((s) => s.service_id !== serviceId));
      } catch (e) {
        console.warn("[UserCatalog] removeService error:", e);
      }
    },
    [userId],
  );

  const hasSkill = useCallback(
    (skillId: string) => userSkills.some((s) => s.skill_id === skillId),
    [userSkills],
  );

  const hasService = useCallback(
    (serviceId: string) => userServices.some((s) => s.service_id === serviceId),
    [userServices],
  );

  return (
    <UserCatalogContext.Provider
      value={{
        userSkills,
        userServices,
        isLoading,
        addSkill,
        removeSkill,
        toggleSkillActive,
        addService,
        removeService,
        hasSkill,
        hasService,
      }}
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
