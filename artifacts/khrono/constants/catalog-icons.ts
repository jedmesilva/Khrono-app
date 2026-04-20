import { Feather } from "@expo/vector-icons";

export type FeatherIconName = React.ComponentProps<typeof Feather>["name"];

export const SKILL_ICON: FeatherIconName = "award";

export const TOOL_SECTION_ICON: FeatherIconName = "tool";

export const TOOL_TYPES: {
  id: "veiculo" | "ferramenta" | "equipamento";
  label: string;
  icon: FeatherIconName;
}[] = [
  { id: "veiculo", label: "Veículo", icon: "truck" },
  { id: "ferramenta", label: "Ferramenta", icon: "tool" },
  { id: "equipamento", label: "Equipamento", icon: "box" },
];

export function toolIconForTipo(tipo: string): FeatherIconName {
  const normalized = (tipo ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return TOOL_TYPES.find((t) => t.id === normalized)?.icon ?? "box";
}

export function toolLabelForTipo(tipo: string): string {
  const normalized = (tipo ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return TOOL_TYPES.find((t) => t.id === normalized)?.label ?? "Equipamento";
}
