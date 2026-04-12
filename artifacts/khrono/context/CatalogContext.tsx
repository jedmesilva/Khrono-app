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

export type CatalogTool = {
  id: string;
  nome: string;
  description: string | null;
  tipo: string;
  status: string;
  verified: boolean;
  image_url: string | null;
};

type CatalogContextType = {
  skills: CatalogSkill[];
  services: CatalogService[];
  tools: CatalogTool[];
  isLoading: boolean;
};

const CatalogContext = createContext<CatalogContextType>({
  skills: [],
  services: [],
  tools: [],
  isLoading: true,
});

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [skills, setSkills] = useState<CatalogSkill[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [tools, setTools] = useState<CatalogTool[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [skillsRes, servicesRes, toolsRes] = await Promise.all([
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
        supabase
          .from("tools_catalog")
          .select("*")
          .eq("status", "active")
          .order("tipo")
          .order("nome"),
      ]);

      if (skillsRes.data) setSkills(skillsRes.data as CatalogSkill[]);
      if (servicesRes.data) setServices(servicesRes.data as CatalogService[]);
      if (toolsRes.data) setTools(toolsRes.data as CatalogTool[]);
      setIsLoading(false);
    }

    load();
  }, []);

  return (
    <CatalogContext.Provider value={{ skills, services, tools, isLoading }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  return useContext(CatalogContext);
}
