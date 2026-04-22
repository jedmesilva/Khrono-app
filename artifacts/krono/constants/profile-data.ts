export type VerificationType = "documentation" | "community" | "pending";
export type LocationMode = "realtime" | "fixed";

export interface Skill {
  id: string;
  name: string;
  type: string;
  description: string;
  verified: { type: VerificationType } | null;
  isNew: boolean;
  addedAt: string;
}

export interface Tool {
  id: string;
  name: string;
  type: string;
  icon: "truck" | "tool" | "box";
  details: string;
  available: boolean;
  verified: { type: VerificationType } | null;
  addedAt: string;
  brand?: string;
  model?: string;
  year?: number;
  verificationStatus?: "unverified" | "pending" | "verified";
}

export interface Review {
  author: string;
  rating: number;
  text: string;
  date: string;
}

export interface ContractRecord {
  client: string;
  date: string;
  duration: string;
  value: string;
}

export interface Service {
  id: string;
  name: string;
  skillIds: string[];
  toolIds: string[];
  rating: number;
  reviews: number;
  contracts: number;
  hourlyRate: number;
  isNew: boolean;
  active: boolean;
  verified: { type: VerificationType } | null;
  addedAt: string;
  reviewsList: Review[];
  contractsList: ContractRecord[];
}

export interface ProviderProfile {
  id: string;
  name: string;
  initials: string;
  since: string;
  totalContracts: number;
  rating: number;
  avaliacoes: number;
  distancia: number;
  locationMode: LocationMode;
  serviceRadius: number;
  fixedAddress: string;
  skills: Skill[];
  tools: Tool[];
  services: Service[];
}

export const VERIFICATION_LABELS: Record<VerificationType, string> = {
  documentation: "Verificado por Documentação",
  community: "Verificado pela Comunidade",
  pending: "Verificação Pendente",
};
