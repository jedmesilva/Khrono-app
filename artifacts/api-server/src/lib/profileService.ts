import { getSupabaseAdmin } from "./supabaseAdmin";

// ─── DTOs ────────────────────────────────────────────────────────────────────

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

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapProviderService(row: any): ProviderServiceDTO {
  return {
    id: row.id,
    nome: row.nome,
    description: row.description ?? null,
    hourlyRate: Number(row.valor_hora ?? 0),
    isActive: Boolean(row.is_active),
    isVerified: Boolean(row.is_verified),
    rating: Number(row.nota ?? 0),
    reviews: Number(row.avaliacoes ?? 0),
    createdAt: row.created_at,
    skillIds: (row.service_skills ?? []).map((s: any) => s.skill_id),
    toolIds: (row.service_tools ?? []).map((t: any) => t.tool_id),
  };
}

function mapTool(row: any): ProviderToolDTO {
  return {
    id: row.id,
    nome: row.nome,
    tipo: row.tipo ?? "equipamento",
    details: row.details ?? "",
    available: Boolean(row.is_available),
    brand: row.brand ?? null,
    model: row.model ?? null,
    manufactureYear: row.manufacture_year ?? null,
    verificationStatus: (row.verification_status as any) ?? "unverified",
    createdAt: row.created_at,
  };
}

// ─── Profile basics ──────────────────────────────────────────────────────────

export async function getMyProfile(profileId: string) {
  const supabase = getSupabaseAdmin();
  const [profileRes, ppRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", profileId).maybeSingle(),
    supabase.from("provider_profiles").select("*").eq("profile_id", profileId).maybeSingle(),
  ]);
  if (profileRes.error) throw new Error(profileRes.error.message);
  return {
    profile: profileRes.data,
    providerProfile: ppRes.data
      ? {
          nota: Number(ppRes.data.nota ?? 0),
          avaliacoes: Number(ppRes.data.avaliacoes ?? 0),
          totalContracts: Number(ppRes.data.total_contracts ?? 0),
          verified: Boolean(ppRes.data.verified),
        }
      : null,
  };
}

const PROFILE_ALLOWED = new Set([
  "nome",
  "telefone",
  "cpf",
  "data_nascimento",
  "address_street",
  "address_number",
  "address_complement",
  "address_neighborhood",
  "address_city",
  "address_state",
  "address_zip",
]);

export async function patchMyProfile(
  profileId: string,
  input: Record<string, unknown>,
) {
  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = {};
  for (const k of Object.keys(input)) {
    if (PROFILE_ALLOWED.has(k)) update[k] = input[k];
  }
  if (Object.keys(update).length === 0) {
    throw new Error("Nenhum campo válido para atualizar.");
  }
  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", profileId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

// ─── Provider services (CRUD) ────────────────────────────────────────────────

export async function listProviderServices(profileId: string): Promise<ProviderServiceDTO[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("provider_services")
    .select(`*, service_skills(skill_id), service_tools(tool_id)`)
    .eq("profile_id", profileId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapProviderService);
}

export async function createProviderService(
  profileId: string,
  input: {
    nome: string;
    description?: string | null;
    hourlyRate: number;
    isActive?: boolean;
    skillIds?: string[];
    toolIds?: string[];
  },
): Promise<ProviderServiceDTO> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("provider_services")
    .insert({
      profile_id: profileId,
      nome: input.nome,
      description: input.description ?? null,
      valor_hora: input.hourlyRate,
      is_active: input.isActive ?? true,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao criar serviço.");

  const serviceId = data.id;
  if (input.skillIds?.length) {
    await supabase.from("service_skills").insert(
      input.skillIds.map((skillId) => ({ service_id: serviceId, skill_id: skillId })),
    );
  }
  if (input.toolIds?.length) {
    await supabase.from("service_tools").insert(
      input.toolIds.map((toolId) => ({ service_id: serviceId, tool_id: toolId })),
    );
  }

  const services = await listProviderServices(profileId);
  return services.find((s) => s.id === serviceId)!;
}

export async function updateProviderService(
  profileId: string,
  serviceId: string,
  input: {
    nome?: string;
    description?: string | null;
    hourlyRate?: number;
    isActive?: boolean;
    skillIds?: string[];
    toolIds?: string[];
  },
): Promise<ProviderServiceDTO> {
  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = {};
  if (input.nome !== undefined) update.nome = input.nome;
  if (input.description !== undefined) update.description = input.description;
  if (input.hourlyRate !== undefined) update.valor_hora = input.hourlyRate;
  if (input.isActive !== undefined) update.is_active = input.isActive;

  if (Object.keys(update).length > 0) {
    const { error } = await supabase
      .from("provider_services")
      .update(update)
      .eq("id", serviceId)
      .eq("profile_id", profileId);
    if (error) throw new Error(error.message);
  }

  if (input.skillIds) {
    await supabase.from("service_skills").delete().eq("service_id", serviceId);
    if (input.skillIds.length > 0) {
      await supabase.from("service_skills").insert(
        input.skillIds.map((skillId) => ({ service_id: serviceId, skill_id: skillId })),
      );
    }
  }
  if (input.toolIds) {
    await supabase.from("service_tools").delete().eq("service_id", serviceId);
    if (input.toolIds.length > 0) {
      await supabase.from("service_tools").insert(
        input.toolIds.map((toolId) => ({ service_id: serviceId, tool_id: toolId })),
      );
    }
  }

  const services = await listProviderServices(profileId);
  return services.find((s) => s.id === serviceId)!;
}

export async function deleteProviderService(
  profileId: string,
  serviceId: string,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("service_skills").delete().eq("service_id", serviceId);
  await supabase.from("service_tools").delete().eq("service_id", serviceId);
  const { error } = await supabase
    .from("provider_services")
    .delete()
    .eq("id", serviceId)
    .eq("profile_id", profileId);
  if (error) throw new Error(error.message);
}

// ─── Provider tools (CRUD) ───────────────────────────────────────────────────

export async function listProviderTools(profileId: string): Promise<ProviderToolDTO[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("provider_tools")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTool);
}

export async function createProviderTool(
  profileId: string,
  input: {
    nome: string;
    tipo: string;
    details?: string;
    brand?: string | null;
    model?: string | null;
    manufactureYear?: number | null;
    isAvailable?: boolean;
  },
): Promise<ProviderToolDTO> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("provider_tools")
    .insert({
      profile_id: profileId,
      nome: input.nome,
      tipo: input.tipo,
      details: input.details ?? "",
      brand: input.brand ?? null,
      model: input.model ?? null,
      manufacture_year: input.manufactureYear ?? null,
      is_available: input.isAvailable ?? true,
      verification_status: "unverified",
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao criar tool.");
  return mapTool(data);
}

export async function updateProviderTool(
  profileId: string,
  toolId: string,
  input: {
    nome?: string;
    tipo?: string;
    details?: string;
    brand?: string | null;
    model?: string | null;
    manufactureYear?: number | null;
    isAvailable?: boolean;
    verificationStatus?: "unverified" | "pending" | "verified";
  },
): Promise<ProviderToolDTO> {
  const supabase = getSupabaseAdmin();
  const update: Record<string, unknown> = {};
  if (input.nome !== undefined) update.nome = input.nome;
  if (input.tipo !== undefined) update.tipo = input.tipo;
  if (input.details !== undefined) update.details = input.details;
  if (input.brand !== undefined) update.brand = input.brand;
  if (input.model !== undefined) update.model = input.model;
  if (input.manufactureYear !== undefined) update.manufacture_year = input.manufactureYear;
  if (input.isAvailable !== undefined) update.is_available = input.isAvailable;
  if (input.verificationStatus !== undefined) update.verification_status = input.verificationStatus;

  const { data, error } = await supabase
    .from("provider_tools")
    .update(update)
    .eq("id", toolId)
    .eq("profile_id", profileId)
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao atualizar tool.");
  return mapTool(data);
}

export async function deleteProviderTool(profileId: string, toolId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("provider_tools")
    .delete()
    .eq("id", toolId)
    .eq("profile_id", profileId);
  if (error) throw new Error(error.message);
}

// ─── User catalog (skills/services FROM CATALOG that user picked) ───────────

export async function listUserSkills(profileId: string): Promise<UserSkillDTO[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_skills")
    .select("id, skill_id, created_at, is_active, skill:skills_catalog(*)")
    .eq("profile_id", profileId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    skillId: r.skill_id,
    isActive: r.is_active !== false,
    createdAt: r.created_at,
    skill: r.skill,
  }));
}

export async function addUserSkill(
  profileId: string,
  skillId: string,
): Promise<UserSkillDTO> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_skills")
    .insert({ profile_id: profileId, skill_id: skillId })
    .select("id, skill_id, created_at, is_active, skill:skills_catalog(*)")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao adicionar skill.");
  return {
    id: data.id,
    skillId: data.skill_id,
    isActive: (data as any).is_active !== false,
    createdAt: (data as any).created_at,
    skill: (data as any).skill,
  };
}

export async function setUserSkillActive(
  profileId: string,
  entryId: string,
  isActive: boolean,
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("user_skills")
    .update({ is_active: isActive })
    .eq("id", entryId)
    .eq("profile_id", profileId);
  if (error) throw new Error(error.message);
}

export async function removeUserSkill(profileId: string, skillId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("user_skills")
    .delete()
    .eq("profile_id", profileId)
    .eq("skill_id", skillId);
  if (error) throw new Error(error.message);
}

export async function listUserServices(profileId: string): Promise<UserServiceDTO[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_services")
    .select("id, service_id, service:services_catalog(*)")
    .eq("profile_id", profileId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    serviceId: r.service_id,
    service: r.service,
  }));
}

export async function addUserService(
  profileId: string,
  serviceId: string,
): Promise<UserServiceDTO> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("user_services")
    .insert({ profile_id: profileId, service_id: serviceId })
    .select("id, service_id, service:services_catalog(*)")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Erro ao adicionar serviço.");
  return {
    id: data.id,
    serviceId: data.service_id,
    service: (data as any).service,
  };
}

export async function removeUserService(profileId: string, serviceId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("user_services")
    .delete()
    .eq("profile_id", profileId)
    .eq("service_id", serviceId);
  if (error) throw new Error(error.message);
}
