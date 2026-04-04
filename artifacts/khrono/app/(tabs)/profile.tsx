import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, AppDialogButton } from "@/components/AppDialog";
import { LocationSheet, LocationMode, formatRadius } from "@/components/LocationSheet";
import { SkillListCard } from "@/components/SkillListCard";
import { ToolListCard } from "@/components/ToolListCard";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useServices } from "@/context/ServicesContext";
import { useTheme } from "@/context/ThemeContext";
import {
  MY_PROFILE,
  Skill,
  Tool,
  VERIFICATION_LABELS,
  VerificationType,
} from "@/constants/profile-data";


type DialogState = { title: string; message?: string; buttons?: AppDialogButton[] } | null;
type ViewState = "main" | "skills" | "skill_detail" | "tools" | "tool_detail";


function SkillDetailView({ skill, colors, onBack, onVerifiedPress, onOptions }: {
  skill: Skill;
  colors: any;
  onBack: () => void;
  onVerifiedPress: (type: VerificationType) => void;
  onOptions: () => void;
}) {
  return (
    <View style={styles.subContainer}>
      <View style={styles.subHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color="#ff6b35" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={styles.nameWithBadge}>
            <Text style={[styles.subTitle, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>{skill.name}</Text>
            {skill.verified && (
              <VerifiedBadge onPress={() => skill.verified && onVerifiedPress(skill.verified.type)} />
            )}
          </View>
          {skill.isNew ? (
            <Text style={[styles.newSkillTag, { color: colors.textMuted }]}>skill nova · sem atividade ainda</Text>
          ) : null}
        </View>
        <Pressable style={[styles.moreBtn, { borderColor: colors.surfaceBorder }]} onPress={onOptions}>
          <Feather name="more-horizontal" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.skillDetailContent}>
        <View style={[styles.toolIconCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.toolIconLarge, { backgroundColor: "#ff6b3312", borderColor: "#ff6b3528" }]}>
            <Feather name="star" size={32} color="#ff6b35" />
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.detailCardLabel, { color: colors.textMuted }]}>CATEGORIA</Text>
            <Text style={[styles.detailCardValue, { color: colors.text }]}>{skill.type}</Text>
          </View>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.detailCardLabel, { color: colors.textMuted }]}>ADICIONADA EM</Text>
            <Text style={[styles.detailCardValue, { color: colors.text }]}>{skill.addedAt}</Text>
          </View>
        </View>

        {skill.description ? (
          <View style={[styles.descriptionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.descriptionLabel, { color: colors.textMuted }]}>DESCRIÇÃO</Text>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{skill.description}</Text>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Feather name="file-text" size={28} color={colors.textDim} />
            <Text style={[styles.emptyText, { color: colors.textDim }]}>sem descrição</Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function ToolDetailView({ tool, colors, onBack, onVerifiedPress, onOptions }: {
  tool: Tool;
  colors: any;
  onBack: () => void;
  onVerifiedPress: (type: VerificationType) => void;
  onOptions: () => void;
}) {
  const iconColor = tool.available ? "#ff6b35" : colors.textMuted;
  const iconBg = tool.available ? "#ff6b3312" : colors.surface;
  const iconBorder = tool.available ? "#ff6b3528" : colors.surfaceBorder;

  return (
    <View style={styles.subContainer}>
      <View style={styles.subHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color="#ff6b35" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View style={styles.nameWithBadge}>
            <Text style={[styles.subTitle, { color: colors.text, flexShrink: 1 }]} numberOfLines={1}>{tool.name}</Text>
            {tool.verified && (
              <VerifiedBadge onPress={() => tool.verified && onVerifiedPress(tool.verified.type)} />
            )}
          </View>
          <Text style={[styles.newSkillTag, { color: tool.available ? "#00e5a0" : colors.textMuted }]}>
            {tool.available ? "disponível" : "indisponível"}
          </Text>
        </View>
        <Pressable style={[styles.moreBtn, { borderColor: colors.surfaceBorder }]} onPress={onOptions}>
          <Feather name="more-horizontal" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={styles.skillDetailContent}>
        <View style={[styles.toolIconCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={[styles.toolIconLarge, { backgroundColor: iconBg, borderColor: iconBorder }]}>
            <Feather name={tool.icon} size={32} color={iconColor} />
          </View>
        </View>

        <View style={styles.detailRow}>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.detailCardLabel, { color: colors.textMuted }]}>TIPO</Text>
            <Text style={[styles.detailCardValue, { color: colors.text }]}>{tool.type}</Text>
          </View>
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.detailCardLabel, { color: colors.textMuted }]}>ADICIONADA EM</Text>
            <Text style={[styles.detailCardValue, { color: colors.text }]}>{tool.addedAt}</Text>
          </View>
        </View>

        <View style={[styles.descriptionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.descriptionLabel, { color: colors.textMuted }]}>DETALHES</Text>
          <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>{tool.details}</Text>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

function SkillsListView({ colors, onBack, onSelectSkill, onVerifiedPress, onAdd }: {
  colors: any;
  onBack: () => void;
  onSelectSkill: (skill: Skill) => void;
  onVerifiedPress: (type: VerificationType) => void;
  onAdd: () => void;
}) {
  const verifiedCount = MY_PROFILE.skills.filter((s) => s.verified !== null).length;

  return (
    <View style={styles.subContainer}>
      <View style={styles.subHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color="#ff6b35" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.subTitle, { color: colors.text }]}>Skills</Text>
          <Text style={[styles.subMeta, { color: colors.textMuted }]}>
            {MY_PROFILE.skills.length} skills · {verifiedCount} verificadas
          </Text>
        </View>
        <Pressable style={[styles.addBtn, { borderColor: colors.surfaceBorder }]} onPress={onAdd}>
          <Feather name="plus" size={11} color={colors.textSecondary} />
          <Text style={[styles.addBtnText, { color: colors.textSecondary }]}>adicionar</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100, gap: 10 }}>
        {MY_PROFILE.skills.map((skill) => (
          <SkillListCard
            key={skill.id}
            name={skill.name}
            description={skill.description}
            isNew={skill.isNew}
            verifiedBadge={skill.verified ? <VerifiedBadge onPress={() => skill.verified && onVerifiedPress(skill.verified.type)} /> : undefined}
            onPress={() => onSelectSkill(skill)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function ToolsListView({ colors, onBack, onVerifiedPress, onAdd, onSelectTool }: {
  colors: any;
  onBack: () => void;
  onVerifiedPress: (type: VerificationType) => void;
  onAdd: () => void;
  onSelectTool: (tool: Tool) => void;
}) {
  const verifiedCount = MY_PROFILE.tools.filter((t) => t.verified !== null).length;

  return (
    <View style={styles.subContainer}>
      <View style={styles.subHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color="#ff6b35" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[styles.subTitle, { color: colors.text }]}>Tools</Text>
          <Text style={[styles.subMeta, { color: colors.textMuted }]}>
            {MY_PROFILE.tools.length} tools · {verifiedCount} verificadas
          </Text>
        </View>
        <Pressable style={[styles.addBtn, { borderColor: colors.surfaceBorder }]} onPress={onAdd}>
          <Feather name="plus" size={11} color={colors.textSecondary} />
          <Text style={[styles.addBtnText, { color: colors.textSecondary }]}>adicionar</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100, gap: 10 }}>
        {MY_PROFILE.tools.map((tool) => (
          <ToolListCard
            key={tool.id}
            name={tool.name}
            iconName={tool.icon}
            description={`${tool.type} · ${tool.details}`}
            badge={tool.available ? "disponível" : "indisponível"}
            available={tool.available}
            verifiedBadge={tool.verified ? <VerifiedBadge onPress={() => tool.verified && onVerifiedPress(tool.verified.type)} /> : undefined}
            onPress={() => onSelectTool(tool)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const { colors } = useTheme();
  const { isActive } = useServices();
  const [view, setView] = useState<ViewState>("main");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedTool, setSelectedTool] = useState<Tool | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [locationMode, setLocationMode] = useState<LocationMode>("realtime");
  const [fixedAddress, setFixedAddress] = useState("Belo Horizonte, MG");
  const [serviceRadius, setServiceRadius] = useState(5000);
  const topPadding = isWeb ? insets.top + 67 : insets.top;

  const verifiedSkillsCount = MY_PROFILE.skills.filter((s) => s.verified !== null).length;
  const verifiedToolsCount = MY_PROFILE.tools.filter((t) => t.verified !== null).length;
  const hasVerified = verifiedSkillsCount > 0 || verifiedToolsCount > 0;

  const avgRating =
    MY_PROFILE.services.filter((s) => s.rating > 0).reduce((sum, s) => sum + s.rating, 0) /
      (MY_PROFILE.services.filter((s) => s.rating > 0).length || 1);

  function handleVerifiedPress(type: VerificationType, context?: "service") {
    const baseMessage = type === "documentation" ? "Identidade e documentação verificadas pela equipe Krono."
      : type === "community" ? "Verificado por avaliações da comunidade de usuários."
      : "Verificação em análise pela equipe Krono.";
    const message = context === "service"
      ? type === "documentation" ? "Serviço verificado por documentação e histórico de contratos na plataforma Krono."
        : type === "community" ? "Serviço verificado pela comunidade com base em avaliações e contratos."
        : "Verificação do serviço em análise pela equipe Krono."
      : baseMessage;
    setDialog({ title: VERIFICATION_LABELS[type], message });
  }

  function handleSkillOptions(skill: Skill) {
    setDialog({
      title: skill.name,
      buttons: [
        { label: "Editar skill", onPress: () => { setDialog(null); router.push("/cadastro-skill"); } },
        {
          label: "Excluir skill", style: "destructive", onPress: () => {
            setDialog({
              title: "Excluir skill?",
              message: `"${skill.name}" será removida do seu perfil permanentemente.`,
              buttons: [
                { label: "Cancelar", onPress: () => setDialog(null) },
                { label: "Excluir", style: "destructive", onPress: () => { setDialog(null); setView("skills"); } },
              ],
            });
          },
        },
        { label: "Cancelar", onPress: () => setDialog(null) },
      ],
    });
  }

  function handleToolOptions(tool: Tool) {
    setDialog({
      title: tool.name,
      buttons: [
        { label: "Editar tool", onPress: () => { setDialog(null); router.push("/cadastro-tool"); } },
        {
          label: "Excluir tool", style: "destructive", onPress: () => {
            setDialog({
              title: "Excluir tool?",
              message: `"${tool.name}" será removida do seu perfil permanentemente.`,
              buttons: [
                { label: "Cancelar", onPress: () => setDialog(null) },
                { label: "Excluir", style: "destructive", onPress: () => { setDialog(null); setView("tools"); } },
              ],
            });
          },
        },
        { label: "Cancelar", onPress: () => setDialog(null) },
      ],
    });
  }

  if (view === "skill_detail" && selectedSkill) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPadding + 20 }]}>
        <SkillDetailView skill={selectedSkill} colors={colors} onBack={() => { setSelectedSkill(null); setView("skills"); }} onVerifiedPress={handleVerifiedPress} onOptions={() => handleSkillOptions(selectedSkill)} />
        <AppDialog visible={!!dialog} title={dialog?.title ?? ""} message={dialog?.message} buttons={dialog?.buttons} onDismiss={() => setDialog(null)} />
      </View>
    );
  }

  if (view === "tool_detail" && selectedTool) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPadding + 20 }]}>
        <ToolDetailView tool={selectedTool} colors={colors} onBack={() => { setSelectedTool(null); setView("tools"); }} onVerifiedPress={handleVerifiedPress} onOptions={() => handleToolOptions(selectedTool)} />
        <AppDialog visible={!!dialog} title={dialog?.title ?? ""} message={dialog?.message} buttons={dialog?.buttons} onDismiss={() => setDialog(null)} />
      </View>
    );
  }

  if (view === "skills") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPadding + 20 }]}>
        <SkillsListView colors={colors} onBack={() => setView("main")} onSelectSkill={(skill) => { setSelectedSkill(skill); setView("skill_detail"); }} onVerifiedPress={handleVerifiedPress} onAdd={() => router.push("/cadastro-skill")} />
        <AppDialog visible={!!dialog} title={dialog?.title ?? ""} message={dialog?.message} buttons={dialog?.buttons} onDismiss={() => setDialog(null)} />
      </View>
    );
  }

  if (view === "tools") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topPadding + 20 }]}>
        <ToolsListView colors={colors} onBack={() => setView("main")} onVerifiedPress={handleVerifiedPress} onAdd={() => router.push("/cadastro-tool")} onSelectTool={(tool) => { setSelectedTool(tool); setView("tool_detail"); }} />
        <AppDialog visible={!!dialog} title={dialog?.title ?? ""} message={dialog?.message} buttons={dialog?.buttons} onDismiss={() => setDialog(null)} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 20, paddingBottom: isWeb ? 34 + 84 + 20 : 100 }]}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View style={styles.header}>
          <Text style={[styles.logo, { color: colors.text }]}>K<Text style={{ color: "#ff6b35" }}>r</Text>ono</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>perfil</Text>
        </View>

        <View style={styles.avatarSection}>
          <View style={[styles.avatarLarge, { backgroundColor: colors.avatarBg, borderColor: "#ff6b3530" }]}>
            <Text style={styles.avatarLargeText}>{MY_PROFILE.initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameWithBadge}>
              <Text style={[styles.profileName, { color: colors.text }]}>{MY_PROFILE.name}</Text>
              {hasVerified && <VerifiedBadge onPress={() => handleVerifiedPress("documentation")} />}
            </View>
            <Text style={[styles.sinceText, { color: colors.textDim }]}>membro desde {MY_PROFILE.since}</Text>
          </View>
        </View>

        <View style={[styles.statsCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{MY_PROFILE.totalContracts}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>CONTRATOS</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{MY_PROFILE.services.length}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>SERVICES</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.divider }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.text }]}>{avgRating.toFixed(1)}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>AVALIAÇÃO</Text>
          </View>
        </View>

        {/* Location card */}
        <Pressable style={[styles.locationCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setLocationSheetOpen(true)}>
          <View style={[styles.locationIconWrap, locationMode === "realtime" ? { backgroundColor: "#00e5a015", borderColor: "#00e5a030" } : { backgroundColor: "#ff6b3515", borderColor: "#ff6b3530" }]}>
            <Feather name={locationMode === "realtime" ? "navigation" : "map-pin"} size={18} color={locationMode === "realtime" ? "#00e5a0" : "#ff6b35"} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.locationTopRow}>
              <Text style={[styles.locationLabel, { color: colors.textMuted }]}>Localização de serviço</Text>
              <View style={[styles.locationModeBadge, locationMode === "realtime" ? { backgroundColor: "#00e5a015", borderColor: "#00e5a025" } : { backgroundColor: "#ff6b3515", borderColor: "#ff6b3525" }]}>
                <Text style={[styles.locationModeBadgeText, { color: locationMode === "realtime" ? "#00e5a0" : "#ff6b35" }]}>
                  {locationMode === "realtime" ? "Tempo real" : "Fixa"}
                </Text>
              </View>
            </View>
            <Text style={[styles.locationAddress, { color: colors.textSecondary }]}>
              {locationMode === "realtime" ? "GPS ativo" : fixedAddress}{" · raio "}{formatRadius(serviceRadius)}
            </Text>
          </View>
          <Feather name="chevron-right" size={16} color={colors.chevron} />
        </Pressable>

        {/* Skills + Tools compact */}
        <View style={styles.compactRow}>
          <Pressable style={[styles.compactCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setView("skills")}>
            <View style={[styles.compactIcon, { backgroundColor: colors.menuIconBg, borderColor: "#ff6b3520" }]}>
              <Feather name="tool" size={16} color="#ff6b35" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.compactTitle, { color: colors.text }]}>Skills</Text>
              <Text style={[styles.compactMeta, { color: colors.textDim }]}>{MY_PROFILE.skills.length} · {verifiedSkillsCount} verificadas</Text>
            </View>
            <Feather name="chevron-right" size={14} color={colors.chevron} />
          </Pressable>
          <Pressable style={[styles.compactCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]} onPress={() => setView("tools")}>
            <View style={[styles.compactIcon, { backgroundColor: colors.menuIconBg, borderColor: "#ff6b3520" }]}>
              <Feather name="box" size={16} color="#ff6b35" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.compactTitle, { color: colors.text }]}>Tools</Text>
              <Text style={[styles.compactMeta, { color: colors.textDim }]}>{MY_PROFILE.tools.length} · {verifiedToolsCount} verificadas</Text>
            </View>
            <Feather name="chevron-right" size={14} color={colors.chevron} />
          </Pressable>
        </View>

        {/* Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Services</Text>
            <Pressable style={[styles.addBtn, { borderColor: colors.surfaceBorder }]} onPress={() => router.push("/cadastro-service")}>
              <Feather name="plus" size={11} color={colors.textSecondary} />
              <Text style={[styles.addBtnText, { color: colors.textSecondary }]}>adicionar</Text>
            </Pressable>
          </View>

          <View style={styles.list}>
            {MY_PROFILE.services.map((sv) => {
              const skill = MY_PROFILE.skills.find((s) => s.id === sv.skillId);
              const tools = MY_PROFILE.tools.filter((t) => sv.toolIds.includes(t.id));
              const active = isActive(sv.id);
              return (
                <Pressable key={sv.id} style={[styles.serviceCard, { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: active ? 1 : 0.45 }]} onPress={() => router.push(`/service/${sv.id}`)}>
                  {/* Linha 1: ícone + nome + badge de verificação */}
                  <View style={styles.serviceNameRow}>
                    <View style={[styles.serviceIconWrap, { backgroundColor: active ? "#ff6b3312" : colors.surface, borderColor: active ? "#ff6b3528" : colors.surfaceBorder }]}>
                      <Feather name="layers" size={15} color={active ? "#ff6b35" : colors.textMuted} />
                    </View>
                    <View style={styles.serviceNameInner}>
                      <Text style={[styles.serviceName, { color: colors.text }]} numberOfLines={2}>{sv.name}</Text>
                      {sv.verified && (
                        <VerifiedBadge onPress={() => sv.verified && handleVerifiedPress(sv.verified.type, "service")} />
                      )}
                    </View>
                  </View>

                  {/* Linha 2: categoria + status + preço */}
                  <View style={styles.serviceBadgeRow}>
                    <View style={styles.serviceBadgesLeft}>
                      {skill?.type && (
                        <View style={styles.serviceCategoryBadge}>
                          <Text style={styles.serviceCategoryBadgeText}>{skill.type}</Text>
                        </View>
                      )}
                      <View style={[styles.serviceStatusBadge, { backgroundColor: active ? "#00e5a012" : colors.surface, borderColor: active ? "#00e5a030" : colors.surfaceBorder }]}>
                        <View style={[styles.serviceStatusDot, { backgroundColor: active ? "#00e5a0" : colors.textDim }]} />
                        <Text style={[styles.serviceStatusText, { color: active ? "#00e5a0" : colors.textDim }]}>
                          {active ? "ativo" : "inativo"}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.serviceRate, { color: active ? "#ff6b35" : colors.textDim }]}>R${sv.hourlyRate}/h</Text>
                  </View>

                  {/* Separador + linha 3: composição (skill + tools) */}
                  {(skill || tools.length > 0) && (
                    <View style={[styles.compositionSection, { borderTopColor: colors.divider }]}>
                      <Text style={[styles.compositionLabel, { color: colors.textDim }]}>composto de</Text>
                      <View style={styles.compositionRow}>
                        {skill && (
                          <View style={[styles.compositionChip, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                            <Feather name="star" size={9} color={colors.textMuted} />
                            <Text style={[styles.compositionChipText, { color: colors.textSecondary }]} numberOfLines={1}>{skill.name}</Text>
                          </View>
                        )}
                        {tools.map((t) => (
                          <View key={t.id} style={[styles.compositionChip, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                            <Feather name="tool" size={9} color={colors.textMuted} />
                            <Text style={[styles.compositionChipText, { color: colors.textSecondary }]} numberOfLines={1}>{t.name}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Linha 4: avaliação ou badge "novo" */}
                  {!sv.isNew ? (
                    <View style={styles.serviceRatingRow}>
                      <Feather name="star" size={10} color="#ff6b35" />
                      <Text style={[styles.serviceRatingText, { color: colors.textSecondary }]}>{sv.rating} · {sv.reviews} avaliações · {sv.contracts} contratos</Text>
                    </View>
                  ) : (
                    <View style={styles.newBadgeWrap}>
                      <View style={styles.newBadge}>
                        <Text style={styles.newBadgeText}>novo</Text>
                      </View>
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <AppDialog visible={!!dialog} title={dialog?.title ?? ""} message={dialog?.message} buttons={dialog?.buttons} onDismiss={() => setDialog(null)} />
      <LocationSheet
        visible={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        mode={locationMode}
        fixedAddress={fixedAddress}
        serviceRadius={serviceRadius}
        onSave={(mode, address, radius) => {
          setLocationMode(mode);
          if (mode === "fixed") setFixedAddress(address);
          setServiceRadius(radius);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  logo: { fontFamily: "Sora_700Bold", fontSize: 24, letterSpacing: -0.5 },
  headerSub: { fontFamily: "DMMono_400Regular", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },
  avatarSection: { flexDirection: "row", gap: 16, alignItems: "flex-start", marginBottom: 20 },
  avatarLarge: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  avatarLargeText: { fontFamily: "DMMono_500Medium", fontSize: 22, color: "#ff6b35" },
  profileInfo: { flex: 1, paddingTop: 4 },
  profileName: { fontFamily: "Sora_700Bold", fontSize: 18 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, marginBottom: 2 },
  locationText: { fontFamily: "DMMono_400Regular", fontSize: 12 },
  sinceText: { fontFamily: "DMMono_400Regular", fontSize: 10 },
  statsCard: { borderWidth: 1, borderRadius: 16, paddingVertical: 14, flexDirection: "row", justifyContent: "space-around", alignItems: "center", marginBottom: 16 },
  statItem: { alignItems: "center" },
  statValue: { fontFamily: "DMMono_500Medium", fontSize: 20, marginBottom: 2 },
  statLabel: { fontFamily: "DMMono_400Regular", fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase" },
  statDivider: { width: 1, height: 30 },
  locationCard: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
  locationIconWrap: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  locationTopRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  locationLabel: { fontFamily: "DMMono_400Regular", fontSize: 10, letterSpacing: 0.5, textTransform: "uppercase", flex: 1 },
  locationModeBadge: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  locationModeBadgeText: { fontFamily: "DMMono_500Medium", fontSize: 9, letterSpacing: 0.5 },
  locationAddress: { fontFamily: "Sora_600SemiBold", fontSize: 13 },
  compactRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  compactCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  compactIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  compactTitle: { fontFamily: "Sora_600SemiBold", fontSize: 13, marginBottom: 2 },
  compactMeta: { fontFamily: "DMMono_400Regular", fontSize: 9 },
  section: { marginBottom: 28 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle: { fontFamily: "Sora_700Bold", fontSize: 14 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  addBtnText: { fontFamily: "DMMono_400Regular", fontSize: 11 },
  list: { gap: 10 },
  serviceCard: { borderWidth: 1, borderRadius: 16, padding: 16, flexDirection: "column", gap: 10 },
  serviceNameRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  serviceIconWrap: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  serviceNameInner: { flex: 1, flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  serviceName: { fontFamily: "Sora_600SemiBold", fontSize: 14, lineHeight: 20, flexShrink: 1 },
  serviceBadgeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  serviceBadgesLeft: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1 },

  serviceRate: { fontFamily: "DMMono_500Medium", fontSize: 14, flexShrink: 0 },
  serviceCategoryBadge: { backgroundColor: "#ff6b3512", borderWidth: 1, borderColor: "#ff6b3528", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  serviceCategoryBadgeText: { fontFamily: "DMMono_500Medium", fontSize: 8, letterSpacing: 1, textTransform: "uppercase", color: "#ff6b35" },
  serviceStatusBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  serviceStatusDot: { width: 5, height: 5, borderRadius: 3 },
  serviceStatusText: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 0.5 },
  compositionSection: { borderTopWidth: 1, paddingTop: 10, gap: 6 },
  compositionLabel: { fontFamily: "DMMono_400Regular", fontSize: 8, letterSpacing: 1, textTransform: "uppercase" },
  compositionRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  compositionChip: { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  compositionChipText: { fontFamily: "DMMono_400Regular", fontSize: 10, maxWidth: 120 },
  serviceRatingRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  serviceRatingText: { fontFamily: "DMMono_400Regular", fontSize: 10 },
  newBadgeWrap: { flexDirection: "row" },
  newBadge: { backgroundColor: "#00e5a015", borderWidth: 1, borderColor: "#00e5a025", borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  newBadgeText: { fontFamily: "DMMono_400Regular", fontSize: 9, color: "#00e5a0" },
  nameWithBadge: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  subContainer: { flex: 1 },
  subHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, marginBottom: 20 },
  backBtn: { padding: 4 },
  subTitle: { fontFamily: "Sora_700Bold", fontSize: 16 },
  subMeta: { fontFamily: "DMMono_400Regular", fontSize: 10, marginTop: 2 },
  newSkillTag: { fontFamily: "DMMono_400Regular", fontSize: 10 },
  skillDetailContent: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 100, gap: 12 },
  descriptionCard: { borderWidth: 1, borderRadius: 16, padding: 18 },
  descriptionLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  descriptionText: { fontFamily: "Sora_400Regular", fontSize: 13, lineHeight: 20 },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontFamily: "DMMono_400Regular", fontSize: 13 },
  moreBtn: { width: 34, height: 34, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  detailRow: { flexDirection: "row", gap: 10 },
  detailCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 16 },
  detailCardLabel: { fontFamily: "DMMono_400Regular", fontSize: 9, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 },
  detailCardValue: { fontFamily: "Sora_600SemiBold", fontSize: 14 },
  toolIconCard: { borderWidth: 1, borderRadius: 16, padding: 20, alignItems: "center" },
  toolIconLarge: { width: 72, height: 72, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "center" },
});
