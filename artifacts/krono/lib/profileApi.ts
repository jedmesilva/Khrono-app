import { apiFetch } from "@/lib/apiClient";

export type ProviderProfileStatsDTO = {
  nota: number;
  avaliacoes: number;
  totalContracts: number;
  verified: boolean;
};

export type ProviderServiceDTO = {
  id: string;
  nome: string;
  description: string | null;
  hourlyRate: number;
  isActive: boolean;
  isVerified: boolean;
  rating: number;
  reviews: number;
  createdAt: string;
  skillIds: string[];
  toolIds: string[];
};

export type ProviderToolDTO = {
  id: string;
  nome: string;
  tipo: string;
  details: string;
  available: boolean;
  brand: string | null;
  model: string | null;
  manufactureYear: number | null;
  verificationStatus: "unverified" | "pending" | "verified";
  createdAt: string;
};

export type UserSkillDTO = {
  id: string;
  skillId: string;
  isActive: boolean;
  createdAt: string;
  skill: any;
};

export type UserServiceDTO = {
  id: string;
  serviceId: string;
  service: any;
};

export const profileApi = {
  get() {
    return apiFetch<{ profile: any; providerProfile: ProviderProfileStatsDTO | null }>(
      "/api/profile",
    );
  },
  patch(input: Record<string, unknown>) {
    return apiFetch<any>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },

  // Provider services
  listServices() {
    return apiFetch<ProviderServiceDTO[]>("/api/me/provider-services");
  },
  createService(input: {
    nome: string;
    description?: string | null;
    hourlyRate: number;
    isActive?: boolean;
    skillIds?: string[];
    toolIds?: string[];
  }) {
    return apiFetch<ProviderServiceDTO>("/api/me/provider-services", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  updateService(
    id: string,
    input: Partial<{
      nome: string;
      description: string | null;
      hourlyRate: number;
      isActive: boolean;
      skillIds: string[];
      toolIds: string[];
    }>,
  ) {
    return apiFetch<ProviderServiceDTO>(
      `/api/me/provider-services/${encodeURIComponent(id)}`,
      { method: "PATCH", body: JSON.stringify(input) },
    );
  },
  deleteService(id: string) {
    return apiFetch<{ ok: true }>(
      `/api/me/provider-services/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
  },

  // Provider tools
  listTools() {
    return apiFetch<ProviderToolDTO[]>("/api/me/tools");
  },
  createTool(input: {
    nome: string;
    tipo: string;
    details?: string;
    brand?: string | null;
    model?: string | null;
    manufactureYear?: number | null;
    isAvailable?: boolean;
  }) {
    return apiFetch<ProviderToolDTO>("/api/me/tools", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  updateTool(
    id: string,
    input: Partial<{
      nome: string;
      tipo: string;
      details: string;
      brand: string | null;
      model: string | null;
      manufactureYear: number | null;
      isAvailable: boolean;
      verificationStatus: "unverified" | "pending" | "verified";
    }>,
  ) {
    return apiFetch<ProviderToolDTO>(`/api/me/tools/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  },
  deleteTool(id: string) {
    return apiFetch<{ ok: true }>(`/api/me/tools/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },

  // User catalog (skills/services picked from catalog)
  listUserSkills() {
    return apiFetch<UserSkillDTO[]>("/api/me/skills");
  },
  addUserSkill(skillId: string) {
    return apiFetch<UserSkillDTO>("/api/me/skills", {
      method: "POST",
      body: JSON.stringify({ skillId }),
    });
  },
  setUserSkillActive(entryId: string, isActive: boolean) {
    return apiFetch<{ ok: true }>(`/api/me/skills/${encodeURIComponent(entryId)}`, {
      method: "PATCH",
      body: JSON.stringify({ isActive }),
    });
  },
  removeUserSkill(skillId: string) {
    return apiFetch<{ ok: true }>(`/api/me/skills/${encodeURIComponent(skillId)}`, {
      method: "DELETE",
    });
  },
  listUserServices() {
    return apiFetch<UserServiceDTO[]>("/api/me/user-services");
  },
  addUserService(serviceId: string) {
    return apiFetch<UserServiceDTO>("/api/me/user-services", {
      method: "POST",
      body: JSON.stringify({ serviceId }),
    });
  },
  removeUserService(serviceId: string) {
    return apiFetch<{ ok: true }>(
      `/api/me/user-services/${encodeURIComponent(serviceId)}`,
      { method: "DELETE" },
    );
  },
};
