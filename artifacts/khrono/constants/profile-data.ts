export type VerificationType = "documentation" | "community" | "pending";

export interface Skill {
  id: string;
  name: string;
  description: string;
  verified: { type: VerificationType } | null;
  isNew: boolean;
}

export interface Tool {
  id: string;
  name: string;
  type: string;
  icon: "truck" | "tool" | "box";
  details: string;
  available: boolean;
  verified: { type: VerificationType } | null;
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
  skillId: string;
  toolIds: string[];
  rating: number;
  reviews: number;
  contracts: number;
  hourlyRate: number;
  isNew: boolean;
  reviewsList: Review[];
  contractsList: ContractRecord[];
}

export const VERIFICATION_LABELS: Record<VerificationType, string> = {
  documentation: "Verificado por Documentação",
  community: "Verificado pela Comunidade",
  pending: "Verificação Pendente",
};

export const MY_PROFILE = {
  name: "Jedme Silva",
  initials: "JS",
  location: "Belo Horizonte, MG",
  totalContracts: 43,
  since: "Mar 2024",
  pinCode: "1257",
  skills: [
    {
      id: "s1",
      name: "Montador de Móveis",
      description:
        "Montagem de móveis de todos os tipos, com ferramentas próprias e experiência em grandes redes de varejo.",
      verified: { type: "documentation" as VerificationType },
      isNew: false,
    },
    {
      id: "s2",
      name: "Carregador / Mudanças",
      description:
        "Serviços de transporte e mudança residencial ou comercial com cuidado e eficiência.",
      verified: { type: "community" as VerificationType },
      isNew: false,
    },
    {
      id: "s3",
      name: "Pintor",
      description:
        "Pintura residencial e comercial, acabamento de qualidade e materiais inclusos.",
      verified: null,
      isNew: true,
    },
  ] as Skill[],
  tools: [
    {
      id: "t1",
      name: "Honda Civic 2019",
      type: "Veículo",
      icon: "truck" as const,
      details: "Prata · 4 portas · Ar condicionado",
      available: true,
      verified: { type: "documentation" as VerificationType },
    },
    {
      id: "t2",
      name: "Kit Furadeira Bosch",
      type: "Ferramenta",
      icon: "tool" as const,
      details: "Furadeira + bits + nível + parafusadeira",
      available: true,
      verified: { type: "community" as VerificationType },
    },
    {
      id: "t3",
      name: "Carrinho de Mudança",
      type: "Equipamento",
      icon: "box" as const,
      details: "Capacidade 200kg · Com cintas",
      available: false,
      verified: null,
    },
  ] as Tool[],
  services: [
    {
      id: "sv1",
      name: "Montagem com Transporte",
      skillId: "s1",
      toolIds: ["t1", "t2"],
      rating: 4.9,
      reviews: 28,
      contracts: 31,
      hourlyRate: 80,
      isNew: false,
      reviewsList: [
        {
          author: "Bruno Souza",
          rating: 5,
          text: "Excelente trabalho, montou tudo rápido e com cuidado.",
          date: "08/11/2024",
        },
        {
          author: "Ana Pereira",
          rating: 5,
          text: "Super recomendo, muito profissional.",
          date: "01/11/2024",
        },
        {
          author: "Rafael Lima",
          rating: 4,
          text: "Bom trabalho, pontual e organizado.",
          date: "20/10/2024",
        },
      ],
      contractsList: [
        { client: "Bruno Souza", date: "08/11/2024", duration: "2h", value: "R$160" },
        { client: "Ana Pereira", date: "01/11/2024", duration: "3h", value: "R$240" },
        { client: "Rafael Lima", date: "20/10/2024", duration: "2h30", value: "R$200" },
      ],
    },
    {
      id: "sv2",
      name: "Mudança Completa",
      skillId: "s2",
      toolIds: ["t1", "t3"],
      rating: 4.7,
      reviews: 12,
      contracts: 12,
      hourlyRate: 60,
      isNew: false,
      reviewsList: [
        {
          author: "Mariana Costa",
          rating: 5,
          text: "Cuidadoso com os móveis, ótimo serviço.",
          date: "05/10/2024",
        },
        {
          author: "Felipe Andrade",
          rating: 4,
          text: "Chegou no horário, serviço bem feito.",
          date: "22/09/2024",
        },
      ],
      contractsList: [
        { client: "Mariana Costa", date: "05/10/2024", duration: "4h", value: "R$240" },
        { client: "Felipe Andrade", date: "22/09/2024", duration: "3h", value: "R$180" },
      ],
    },
    {
      id: "sv3",
      name: "Pintura Residencial",
      skillId: "s3",
      toolIds: [],
      rating: 0,
      reviews: 0,
      contracts: 0,
      hourlyRate: 70,
      isNew: true,
      reviewsList: [],
      contractsList: [],
    },
  ] as Service[],
};
