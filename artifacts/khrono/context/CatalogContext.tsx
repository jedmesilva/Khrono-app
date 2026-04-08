import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type CatalogSkill = {
  id: string;
  nome: string;
  description: string | null;
  category: string | null;
  status: string;
  verified: boolean;
  image_url: string | null;
};

export type CatalogService = {
  id: string;
  nome: string;
  description: string | null;
  category: string | null;
  status: string;
  verified: boolean;
  image_url: string | null;
};

type CatalogContextType = {
  skills: CatalogSkill[];
  services: CatalogService[];
  isLoading: boolean;
};

const CatalogContext = createContext<CatalogContextType>({
  skills: [],
  services: [],
  isLoading: true,
});

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [skills, setSkills] = useState<CatalogSkill[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [skillsRes, servicesRes] = await Promise.all([
        supabase
          .from("skills_catalog")
          .select("*")
          .eq("status", "active")
          .order("category")
          .order("nome"),
        supabase
          .from("services_catalog")
          .select("*")
          .eq("status", "active")
          .order("category")
          .order("nome"),
      ]);

      if (skillsRes.data) setSkills(skillsRes.data as CatalogSkill[]);
      if (servicesRes.data) setServices(servicesRes.data as CatalogService[]);
      setIsLoading(false);
    }

    load();
  }, []);

  return (
    <CatalogContext.Provider value={{ skills, services, isLoading }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  return useContext(CatalogContext);
}
