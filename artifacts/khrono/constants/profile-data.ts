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

export const VERIFICATION_LABELS: Record<VerificationType, string> = {
  documentation: "Verificado por Documentação",
  community: "Verificado pela Comunidade",
  pending: "Verificação Pendente",
};

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

export const PROVIDERS: ProviderProfile[] = [
  {
    id: "p-1234",
    name: "Carlos Mendes",
    initials: "CM",
    since: "Jan 2023",
    totalContracts: 87,
    rating: 4.8,
    avaliacoes: 42,
    distancia: 0.8,
    locationMode: "fixed",
    serviceRadius: 3000,
    fixedAddress: "Savassi, BH",
    skills: [
      { id: "cm-s1", name: "Pintor", type: "Construção", description: "Pintura residencial e comercial com acabamento de alta qualidade e materiais inclusos.", verified: { type: "documentation" as VerificationType }, isNew: false, addedAt: "Jan 2023" },
      { id: "cm-s2", name: "Gesseiro", type: "Construção", description: "Aplicação de gesso, texturas e acabamentos decorativos em paredes e tetos.", verified: { type: "community" as VerificationType }, isNew: false, addedAt: "Jan 2023" },
    ],
    tools: [
      { id: "cm-t1", name: "Rolo 23cm", type: "ferramenta", icon: "tool" as const, details: "Rolo para pintura de alta cobertura", available: true, verified: null, addedAt: "Jan 2023" },
      { id: "cm-t2", name: "Escada 6m", type: "equipamento", icon: "box" as const, details: "Escada alumínio extensível 6 metros", available: true, verified: { type: "community" as VerificationType }, addedAt: "Jan 2023" },
      { id: "cm-t3", name: "Desempenadeira", type: "ferramenta", icon: "tool" as const, details: "Desempenadeira inox 50cm para gesso", available: true, verified: null, addedAt: "Jan 2023" },
    ],
    services: [
      {
        id: "cm-sv1",
        name: "Pintura Residencial",
        skillIds: ["cm-s1"],
        toolIds: ["cm-t1", "cm-t2"],
        rating: 4.8,
        reviews: 42,
        contracts: 61,
        hourlyRate: 45,
        isNew: false,
        active: true,
        verified: { type: "documentation" as VerificationType },
        addedAt: "Jan 2023",
        reviewsList: [
          { author: "Roberto Lima", rating: 5, text: "Trabalho impecável, pintura perfeita e no prazo.", date: "12/01/2025" },
          { author: "Carla Souza", rating: 5, text: "Muito profissional, deixou tudo limpinho depois.", date: "03/01/2025" },
          { author: "Marcos Andrade", rating: 4, text: "Bom trabalho, algumas retoques precisaram de ajuste.", date: "18/12/2024" },
        ],
        contractsList: [
          { client: "Roberto Lima", date: "12/01/2025", duration: "6h", value: "R$270" },
          { client: "Carla Souza", date: "03/01/2025", duration: "4h", value: "R$180" },
          { client: "Marcos Andrade", date: "18/12/2024", duration: "8h", value: "R$360" },
        ],
      },
      {
        id: "cm-sv2",
        name: "Gessaria",
        skillIds: ["cm-s2"],
        toolIds: ["cm-t3"],
        rating: 4.5,
        reviews: 8,
        contracts: 10,
        hourlyRate: 40,
        isNew: false,
        active: true,
        verified: { type: "community" as VerificationType },
        addedAt: "Jan 2023",
        reviewsList: [
          { author: "Fernanda Costa", rating: 5, text: "Textura ficou linda, recomendo muito!", date: "05/11/2024" },
          { author: "Paulo Ferreira", rating: 4, text: "Bom serviço, pontual e caprichoso.", date: "20/10/2024" },
        ],
        contractsList: [
          { client: "Fernanda Costa", date: "05/11/2024", duration: "5h", value: "R$200" },
          { client: "Paulo Ferreira", date: "20/10/2024", duration: "4h", value: "R$160" },
        ],
      },
    ],
  },
  {
    id: "p-5678",
    name: "Juliana Rocha",
    initials: "JR",
    since: "Jun 2022",
    totalContracts: 152,
    rating: 5.0,
    avaliacoes: 128,
    distancia: 2.1,
    locationMode: "realtime",
    serviceRadius: 8000,
    fixedAddress: "",
    skills: [
      { id: "jr-s1", name: "Personal Trainer", type: "Bem-estar", description: "Treinos personalizados para emagrecimento, hipertrofia e condicionamento físico.", verified: { type: "documentation" as VerificationType }, isNew: false, addedAt: "Jun 2022" },
      { id: "jr-s2", name: "Nutricionista", type: "Bem-estar", description: "Consultoria nutricional com planos alimentares personalizados.", verified: { type: "documentation" as VerificationType }, isNew: false, addedAt: "Jun 2022" },
    ],
    tools: [
      { id: "jr-t1", name: "Kit de Treino", type: "equipamento", icon: "box" as const, details: "Halteres, elásticos e colchonete", available: true, verified: { type: "documentation" as VerificationType }, addedAt: "Jun 2022" },
    ],
    services: [
      {
        id: "jr-sv1",
        name: "Personal Training",
        skillIds: ["jr-s1"],
        toolIds: ["jr-t1"],
        rating: 5.0,
        reviews: 128,
        contracts: 140,
        hourlyRate: 80,
        isNew: false,
        active: true,
        verified: { type: "documentation" as VerificationType },
        addedAt: "Jun 2022",
        reviewsList: [
          { author: "Ana Beatriz", rating: 5, text: "Melhor personal que já tive, resultados incríveis!", date: "10/01/2025" },
          { author: "Thiago Melo", rating: 5, text: "Super dedicada e atenciosa, recomendo demais.", date: "02/01/2025" },
          { author: "Luciana Pires", rating: 5, text: "Treinos ótimos, muito motivada e profissional.", date: "15/12/2024" },
        ],
        contractsList: [
          { client: "Ana Beatriz", date: "10/01/2025", duration: "1h", value: "R$80" },
          { client: "Thiago Melo", date: "02/01/2025", duration: "1h", value: "R$80" },
          { client: "Luciana Pires", date: "15/12/2024", duration: "1h", value: "R$80" },
        ],
      },
      {
        id: "jr-sv2",
        name: "Consultoria Nutricional",
        skillIds: ["jr-s2"],
        toolIds: [],
        rating: 4.9,
        reviews: 34,
        contracts: 38,
        hourlyRate: 96,
        isNew: false,
        active: true,
        verified: { type: "documentation" as VerificationType },
        addedAt: "Jun 2022",
        reviewsList: [
          { author: "Renata Silva", rating: 5, text: "Plano alimentar completíssimo, emagreci 8kg!", date: "08/12/2024" },
          { author: "Diego Castro", rating: 5, text: "Muito profissional e explicativa.", date: "25/11/2024" },
        ],
        contractsList: [
          { client: "Renata Silva", date: "08/12/2024", duration: "1h30", value: "R$144" },
          { client: "Diego Castro", date: "25/11/2024", duration: "1h", value: "R$96" },
        ],
      },
    ],
  },
  {
    id: "p-9012",
    name: "Pedro Alves",
    initials: "PA",
    since: "Mar 2023",
    totalContracts: 45,
    rating: 4.7,
    avaliacoes: 31,
    distancia: 3.4,
    locationMode: "fixed",
    serviceRadius: 1500,
    fixedAddress: "Lourdes, BH",
    skills: [
      { id: "pa-s1", name: "Eletricista", type: "Construção", description: "Instalações elétricas residenciais e comerciais, com certificação NR10.", verified: { type: "documentation" as VerificationType }, isNew: false, addedAt: "Mar 2023" },
    ],
    tools: [
      { id: "pa-t1", name: "Alicate Amperímetro", type: "ferramenta", icon: "tool" as const, details: "Alicate digital profissional", available: true, verified: null, addedAt: "Mar 2023" },
      { id: "pa-t2", name: "Kit Cabos", type: "equipamento", icon: "box" as const, details: "Cabos elétricos PP 10m, 16A, 25A", available: true, verified: null, addedAt: "Mar 2023" },
    ],
    services: [
      {
        id: "pa-sv1",
        name: "Instalação Elétrica",
        skillIds: ["pa-s1"],
        toolIds: ["pa-t1", "pa-t2"],
        rating: 4.7,
        reviews: 31,
        contracts: 34,
        hourlyRate: 60,
        isNew: false,
        active: true,
        verified: { type: "documentation" as VerificationType },
        addedAt: "Mar 2023",
        reviewsList: [
          { author: "Gustavo Ramos", rating: 5, text: "Serviço excelente, tudo organizado e seguro.", date: "15/01/2025" },
          { author: "Simone Alves", rating: 4, text: "Resolveu o problema rapidamente.", date: "28/12/2024" },
        ],
        contractsList: [
          { client: "Gustavo Ramos", date: "15/01/2025", duration: "3h", value: "R$180" },
          { client: "Simone Alves", date: "28/12/2024", duration: "2h", value: "R$120" },
        ],
      },
      {
        id: "pa-sv2",
        name: "Manutenção Elétrica",
        skillIds: ["pa-s1"],
        toolIds: ["pa-t1"],
        rating: 4.6,
        reviews: 12,
        contracts: 14,
        hourlyRate: 54,
        isNew: false,
        active: true,
        verified: null,
        addedAt: "Mar 2023",
        reviewsList: [
          { author: "Helena Vieira", rating: 5, text: "Achou o problema rápido, muito competente.", date: "10/12/2024" },
        ],
        contractsList: [
          { client: "Helena Vieira", date: "10/12/2024", duration: "1h30", value: "R$81" },
        ],
      },
    ],
  },
  {
    id: "p-4321",
    name: "Isabela Martins",
    initials: "IM",
    since: "Aug 2022",
    totalContracts: 94,
    rating: 4.9,
    avaliacoes: 77,
    distancia: 0.5,
    locationMode: "realtime",
    serviceRadius: 2000,
    fixedAddress: "",
    skills: [
      { id: "im-s1", name: "Cuidadora", type: "Cuidados", description: "Cuidados com idosos e pessoas com necessidades especiais, com experiência em ambiente hospitalar.", verified: { type: "documentation" as VerificationType }, isNew: false, addedAt: "Aug 2022" },
    ],
    tools: [
      { id: "im-t1", name: "Cadeira de Rodas", type: "equipamento", icon: "box" as const, details: "Cadeira dobrável, confortável", available: true, verified: { type: "community" as VerificationType }, addedAt: "Aug 2022" },
    ],
    services: [
      {
        id: "im-sv1",
        name: "Cuidados com Idosos",
        skillIds: ["im-s1"],
        toolIds: [],
        rating: 4.9,
        reviews: 77,
        contracts: 83,
        hourlyRate: 40,
        isNew: false,
        active: true,
        verified: { type: "community" as VerificationType },
        addedAt: "Aug 2022",
        reviewsList: [
          { author: "Família Souza", rating: 5, text: "Cuidou da minha mãe com carinho e dedicação.", date: "14/01/2025" },
          { author: "Família Rocha", rating: 5, text: "Muito atenciosa, meu pai adorou.", date: "05/01/2025" },
          { author: "Família Mendes", rating: 5, text: "Profissional exemplar, super recomendo.", date: "20/12/2024" },
        ],
        contractsList: [
          { client: "Família Souza", date: "14/01/2025", duration: "8h", value: "R$320" },
          { client: "Família Rocha", date: "05/01/2025", duration: "8h", value: "R$320" },
          { client: "Família Mendes", date: "20/12/2024", duration: "12h", value: "R$480" },
        ],
      },
      {
        id: "im-sv2",
        name: "Acompanhamento Hospitalar",
        skillIds: ["im-s1"],
        toolIds: ["im-t1"],
        rating: 4.8,
        reviews: 22,
        contracts: 25,
        hourlyRate: 52,
        isNew: false,
        active: true,
        verified: { type: "documentation" as VerificationType },
        addedAt: "Aug 2022",
        reviewsList: [
          { author: "Família Lima", rating: 5, text: "Ficou com meu pai durante a cirurgia, tranquilizador.", date: "02/01/2025" },
          { author: "Família Ferreira", rating: 5, text: "Profissional incrível, muito calma e segura.", date: "10/12/2024" },
        ],
        contractsList: [
          { client: "Família Lima", date: "02/01/2025", duration: "6h", value: "R$312" },
          { client: "Família Ferreira", date: "10/12/2024", duration: "4h", value: "R$208" },
        ],
      },
    ],
  },
];

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
      type: "Construção",
      description:
        "Montagem de móveis de todos os tipos, com ferramentas próprias e experiência em grandes redes de varejo.",
      verified: { type: "documentation" as VerificationType },
      isNew: false,
      addedAt: "Mar 2024",
    },
    {
      id: "s2",
      name: "Carregador / Mudanças",
      type: "Transporte",
      description:
        "Serviços de transporte e mudança residencial ou comercial com cuidado e eficiência.",
      verified: { type: "community" as VerificationType },
      isNew: false,
      addedAt: "Mar 2024",
    },
    {
      id: "s3",
      name: "Pintor",
      type: "Construção",
      description:
        "Pintura residencial e comercial, acabamento de qualidade e materiais inclusos.",
      verified: null,
      isNew: true,
      addedAt: "Jan 2025",
    },
  ] as Skill[],
  tools: [
    {
      id: "t1",
      name: "Honda Civic 2019",
      type: "veiculo",
      icon: "truck" as const,
      details: "Prata · 4 portas · Ar condicionado",
      available: true,
      verified: { type: "documentation" as VerificationType },
      addedAt: "Mar 2024",
    },
    {
      id: "t2",
      name: "Kit Furadeira Bosch",
      type: "ferramenta",
      icon: "tool" as const,
      details: "Furadeira + bits + nível + parafusadeira",
      available: true,
      verified: { type: "community" as VerificationType },
      addedAt: "Mar 2024",
    },
    {
      id: "t3",
      name: "Carrinho de Mudança",
      type: "equipamento",
      icon: "box" as const,
      details: "Capacidade 200kg · Com cintas",
      available: false,
      verified: null,
      addedAt: "Jun 2024",
    },
  ] as Tool[],
  services: [
    {
      id: "sv1",
      name: "Montagem com Transporte",
      skillIds: ["s1"],
      toolIds: ["t1", "t2"],
      rating: 4.9,
      reviews: 28,
      contracts: 31,
      hourlyRate: 80,
      isNew: false,
      active: true,
      verified: { type: "documentation" as VerificationType },
      addedAt: "Mar 2024",
      reviewsList: [
        { author: "Bruno Souza", rating: 5, text: "Excelente trabalho, montou tudo rápido e com cuidado.", date: "08/11/2024" },
        { author: "Ana Pereira", rating: 5, text: "Super recomendo, muito profissional.", date: "01/11/2024" },
        { author: "Rafael Lima", rating: 4, text: "Bom trabalho, pontual e organizado.", date: "20/10/2024" },
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
      skillIds: ["s2"],
      toolIds: ["t1", "t3"],
      rating: 4.7,
      reviews: 12,
      contracts: 12,
      hourlyRate: 60,
      isNew: false,
      active: false,
      verified: { type: "community" as VerificationType },
      addedAt: "Mar 2024",
      reviewsList: [
        { author: "Mariana Costa", rating: 5, text: "Cuidadoso com os móveis, ótimo serviço.", date: "05/10/2024" },
        { author: "Felipe Andrade", rating: 4, text: "Chegou no horário, serviço bem feito.", date: "22/09/2024" },
      ],
      contractsList: [
        { client: "Mariana Costa", date: "05/10/2024", duration: "4h", value: "R$240" },
        { client: "Felipe Andrade", date: "22/09/2024", duration: "3h", value: "R$180" },
      ],
    },
    {
      id: "sv3",
      name: "Pintura Residencial",
      skillIds: ["s3"],
      toolIds: [],
      rating: 0,
      reviews: 0,
      contracts: 0,
      hourlyRate: 70,
      isNew: true,
      active: true,
      verified: null,
      addedAt: "Jan 2025",
      reviewsList: [],
      contractsList: [],
    },
  ] as Service[],
};
