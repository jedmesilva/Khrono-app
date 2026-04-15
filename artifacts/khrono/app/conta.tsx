import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog } from "@/components/AppDialog";
import { ScreenHeader } from "@/components/ScreenHeader";
import { useToast } from "@/context/ToastContext";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { DocStatus, useDocuments } from "@/context/DocumentsContext";
import { supabase } from "@/lib/supabase";

type VerifStatus = "none" | "pending" | "approved" | "rejected";
type EditingField = "nome" | "email" | "telefone" | "cpf" | "nascimento" | null;

function formatCpf(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 11) return raw;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function maskCpf(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (!d) return "";
  return "•••.•••.•••-••";
}

function applyBirthDateMask(text: string): string {
  const d = text.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

function applyCpfMask(text: string): string {
  const d = text.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function applyPhoneMask(text: string): string {
  const d = text.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function isoToBr(iso: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  return iso;
}

function brToIso(br: string): string {
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(br)) {
    const [d, m, y] = br.split("/");
    return `${y}-${m}-${d}`;
  }
  return br;
}

const STATUS_COLORS: Record<VerifStatus, { bg: string; border: string; text: string; label: string }> = {
  none:     { bg: "transparent",    border: "transparent",     text: "transparent",   label: "Não enviado" },
  pending:  { bg: "#e0603012",      border: "#e0603030",       text: "#e06030",       label: "Em análise"  },
  approved: { bg: "#18a06b12",      border: "#18a06b30",       text: "#18a06b",       label: "Aprovado"    },
  rejected: { bg: "#ff3b3015",      border: "#ff3b3030",       text: "#ff3b30",       label: "Reprovado"   },
};

const DOC_STATUS_COLORS: Record<DocStatus, { bg: string; border: string; text: string; label: string }> = {
  analise:    { bg: "#e0603012", border: "#e0603030", text: "#e06030",  label: "Em análise" },
  verificado: { bg: "#18a06b12", border: "#18a06b30", text: "#18a06b",  label: "Verificado" },
  invalido:   { bg: "#ff3b3015", border: "#ff3b3030", text: "#ff3b30",  label: "Inválido"   },
};

function DocStatusBadge({ status }: { status: DocStatus }) {
  const s = DOC_STATUS_COLORS[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.statusBadgeText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

function StatusBadge({ status }: { status: VerifStatus }) {
  const s = STATUS_COLORS[status];
  if (status === "none") return null;
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.statusBadgeText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}


export default function ContaScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;
  const { user, refreshUser, logout } = useAuth();

  const showToast = useToast();

  const [editing, setEditing] = useState<EditingField>(null);
  const [draft, setDraft] = useState("");
  const [savingField, setSavingField] = useState(false);

  const [userData, setUserData] = useState({ nome: "", email: "", telefone: "", cpf: "", nascimento: "" });
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  const { documents } = useDocuments();
  const [faceStatus, setFaceStatus] = useState<VerifStatus>("none");

  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  const [showCpf, setShowCpf] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [pwdExpanded, setPwdExpanded] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      if (!user?.id) return;
      setLoadingProfile(true);
      const { data } = await supabase
        .from("profiles")
        .select("name, email, phone, profile_image_url, cpf, birth_date")
        .eq("id", user.id)
        .single();

      if (data) {
        const rawPhone = data.phone ?? "";
        const digits = rawPhone.startsWith("+55") ? rawPhone.slice(3) : rawPhone;
        const formatted = digits.length === 11
          ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
          : digits;
        setUserData({
          nome: data.name ?? "",
          email: data.email ?? "",
          telefone: formatted,
          cpf: formatCpf(data.cpf ?? ""),
          nascimento: isoToBr(data.birth_date ?? ""),
        });
        if (data.profile_image_url) setProfileImage(data.profile_image_url);
      }
      setLoadingProfile(false);
    }
    loadProfile();
  }, [user?.id]);

  function startEdit(field: EditingField) {
    const val = field ? userData[field] : "";
    setDraft(val);
    setEditing(field);
  }

  async function saveEdit() {
    if (!editing || !user?.id) return;
    setSavingField(true);
    const dbField: Record<string, string> = { nome: "name", email: "email", telefone: "phone", cpf: "cpf", nascimento: "birth_date" };
    let valueToSave = draft;
    let displayValue = draft;
    if (editing === "telefone") {
      const digits = draft.replace(/\D/g, "");
      valueToSave = digits ? `+55${digits}` : "";
    } else if (editing === "cpf") {
      valueToSave = draft.replace(/\D/g, "");
      displayValue = formatCpf(draft);
    } else if (editing === "nascimento") {
      valueToSave = brToIso(draft);
      displayValue = isoToBr(valueToSave) || draft;
    }
    const { error } = await supabase.from("profiles").update({ [dbField[editing]]: valueToSave }).eq("id", user.id);
    setSavingField(false);
    if (error) { Alert.alert("Erro", "Não foi possível salvar. Tente novamente."); return; }
    setUserData((prev) => ({ ...prev, [editing]: displayValue }));
    setEditing(null);
    await refreshUser();
    showToast("Alteração salva com sucesso");
  }

  function cancelEdit() { setEditing(null); setDraft(""); }

  async function pickProfileImage() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled) setPendingImage(result.assets[0].uri);
  }

  function saveProfileImage() { setProfileImage(pendingImage); setPendingImage(null); showToast("Foto de perfil atualizada"); }
  function discardProfileImage() { setPendingImage(null); }

  async function handleChangePassword() {
    if (!currentPwd || !newPwd || !confirmPwd) return;
    if (newPwd !== confirmPwd) { Alert.alert("Erro", "A nova senha e a confirmação não coincidem."); return; }
    if (newPwd.length < 6) { Alert.alert("Erro", "A nova senha deve ter pelo menos 6 caracteres."); return; }
    setChangingPwd(true);
    const email = userData.email || user?.contact || "";
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPwd });
    if (signInError) { setChangingPwd(false); Alert.alert("Senha incorreta", "A senha atual informada está errada."); return; }
    const { error: updateError } = await supabase.auth.updateUser({ password: newPwd });
    setChangingPwd(false);
    if (updateError) { Alert.alert("Erro", updateError.message); return; }
    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
    setPwdExpanded(false);
    showToast("Senha alterada com sucesso");
  }

  const initials = userData.nome
    ? userData.nome.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : (user?.name ?? "?").slice(0, 2).toUpperCase();

  const FIELDS: { key: keyof typeof userData; label: string; masked?: boolean; placeholder: string }[] = [
    { key: "nome",       label: "Nome completo",      placeholder: "Seu nome completo"    },
    { key: "email",      label: "E-mail",             placeholder: "seu@email.com"        },
    { key: "telefone",   label: "Telefone",           placeholder: "(00) 00000-0000"      },
    { key: "cpf",        label: "CPF",                masked: true, placeholder: "000.000.000-00" },
    { key: "nascimento", label: "Data de nascimento", placeholder: "DD/MM/AAAA"           },
  ];

  const faceNeedsAction = faceStatus === "none" || faceStatus === "rejected";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: topPadding + 16, paddingBottom: isWeb ? 34 + 84 + 20 : 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader title="Minha conta" />

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Pressable style={styles.avatarWrap} onPress={pickProfileImage}>
            {pendingImage || profileImage ? (
              <Image source={{ uri: pendingImage ?? profileImage! }} style={styles.avatarImage} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: colors.avatarBg, borderColor: colors.accent + "30" }]}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={[styles.avatarEditBadge, { borderColor: colors.background }]}>
              <Feather name="camera" size={11} color="#fff" />
            </View>
          </Pressable>

          {!loadingProfile && userData.nome ? (
            <Text style={[styles.avatarName, { color: colors.text }]}>{userData.nome}</Text>
          ) : null}

          {pendingImage && (
            <View style={styles.avatarActions}>
              <Pressable style={[styles.avatarDiscardBtn, { borderColor: colors.inputBorder, backgroundColor: colors.inputBg }]} onPress={discardProfileImage}>
                <Feather name="x" size={13} color={colors.textMuted} />
                <Text style={[styles.avatarDiscardText, { color: colors.textMuted }]}>Descartar</Text>
              </Pressable>
              <Pressable style={styles.avatarSaveBtn} onPress={saveProfileImage}>
                <Feather name="check" size={13} color="#fff" />
                <Text style={styles.avatarSaveText}>Salvar foto</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Dados pessoais */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Dados pessoais</Text>
          <View style={[styles.fieldList, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            {FIELDS.map((f) => {
              const isEditing = editing === f.key;
              const rawValue = userData[f.key];

              let displayValue: string;
              if (f.key === "cpf" && !isEditing) {
                displayValue = rawValue
                  ? (showCpf ? rawValue : maskCpf(rawValue))
                  : (loadingProfile ? "Carregando..." : "Não informado");
              } else {
                displayValue = rawValue || (loadingProfile ? "Carregando..." : "Não informado");
              }

              function handleChangeText(text: string) {
                if (f.key === "cpf") {
                  setDraft(applyCpfMask(text));
                } else if (f.key === "nascimento") {
                  setDraft(applyBirthDateMask(text));
                } else if (f.key === "telefone") {
                  setDraft(applyPhoneMask(text));
                } else {
                  setDraft(text);
                }
              }

              return (
                <View key={f.key} style={[styles.fieldRow, { borderBottomColor: colors.surface }, isEditing && { backgroundColor: colors.inputBg, borderBottomColor: "#e0603020" }]}>
                  <View style={styles.fieldMeta}>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{f.label}</Text>
                    {isEditing ? (
                      <TextInput
                        style={[styles.fieldInput, { color: colors.text }]}
                        value={draft}
                        onChangeText={handleChangeText}
                        placeholder={f.placeholder}
                        placeholderTextColor={colors.textDim}
                        autoCapitalize="none"
                        autoFocus
                        keyboardType={f.key === "telefone" || f.key === "cpf" || f.key === "nascimento" ? "numeric" : "default"}
                      />
                    ) : (
                      <Text style={[styles.fieldValue, { color: colors.textSecondary }, !rawValue && { color: colors.textDim }]}>
                        {displayValue}
                      </Text>
                    )}
                  </View>
                  {isEditing ? (
                    <View style={styles.editActions}>
                      <Pressable style={[styles.cancelBtn, { borderColor: colors.inputBorder }]} onPress={cancelEdit} disabled={savingField}>
                        <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
                      </Pressable>
                      <Pressable style={styles.saveBtn} onPress={saveEdit} disabled={savingField}>
                        <Text style={styles.saveBtnText}>{savingField ? "..." : "Salvar"}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <View style={styles.fieldActions}>
                      {f.key === "cpf" && rawValue ? (
                        <Pressable style={styles.eyeBtn} onPress={() => setShowCpf((v) => !v)} hitSlop={10}>
                          <Feather name={showCpf ? "eye-off" : "eye"} size={14} color={colors.textMuted} />
                        </Pressable>
                      ) : null}
                      <Pressable style={styles.editIconBtn} onPress={() => startEdit(f.key)}>
                        <Feather name="edit-2" size={13} color={colors.textMuted} />
                      </Pressable>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Verificação de identidade */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Verificação de identidade</Text>

          <View style={[styles.verifBlock, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.verifBlockHeader}>
              <View style={[styles.verifIconWrap, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}>
                <Feather name="file-text" size={16} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.verifBlockTitle, { color: colors.textSecondary }]}>Documentos</Text>
                <Text style={[styles.verifBlockSub, { color: colors.textMuted }]}>RG, CNH ou Passaporte</Text>
              </View>
            </View>

            {documents.length > 0 && (
              <View style={[styles.docList, { borderTopColor: colors.surface }]}>
                {documents.map((doc, index) => (
                  <View key={doc.id}>
                    {index > 0 && <View style={[styles.docDivider, { backgroundColor: colors.surface }]} />}
                    <View style={styles.docItem}>
                      <View style={[styles.docItemIcon, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                        <Feather name="file-text" size={14} color={colors.textSecondary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.docItemType, { color: colors.textSecondary }]}>{doc.type}</Text>
                        <Text style={[styles.docItemMeta, { color: colors.textMuted }]}>
                          {doc.submittedAt} · {doc.files.length} arquivo{doc.files.length !== 1 ? "s" : ""}
                        </Text>
                      </View>
                      <DocStatusBadge status={doc.status} />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {documents.length === 0 && (
              <View style={[styles.docEmpty, { borderTopColor: colors.surface }]}>
                <Feather name="inbox" size={22} color={colors.textDim} />
                <Text style={[styles.docEmptyText, { color: colors.textDim }]}>Nenhum documento enviado</Text>
              </View>
            )}

            <View style={styles.verifContent}>
              <Pressable style={[styles.submitVerifBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]} onPress={() => router.push("/envio-documento")}>
                <Feather name="upload" size={14} color={colors.text} />
                <Text style={[styles.submitVerifBtnText, { color: colors.text }]}>Enviar documento</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.verifBlock, { marginTop: 10, backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.verifBlockHeader}>
              <View style={[styles.verifIconWrap, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}>
                <Feather name="aperture" size={16} color={colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.verifBlockTitle, { color: colors.textSecondary }]}>Reconhecimento facial</Text>
                <Text style={[styles.verifBlockSub, { color: colors.textMuted }]}>Verificação com liveness</Text>
              </View>
              <StatusBadge status={faceStatus} />
            </View>

            {faceStatus === "rejected" && (
              <View style={styles.rejectedMsg}>
                <Feather name="alert-circle" size={12} color="#ff3b30" />
                <Text style={styles.rejectedMsgText}>
                  Não foi possível confirmar a identidade. Tente em ambiente com boa iluminação.
                </Text>
              </View>
            )}

            {faceNeedsAction && (
              <View style={styles.verifContent}>
                <Pressable style={[styles.submitVerifBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]} onPress={() => router.push("/verificacao-facial")}>
                  <Feather name="video" size={14} color={colors.text} />
                  <Text style={[styles.submitVerifBtnText, { color: colors.text }]}>Fazer reconhecimento facial</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* Segurança */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Segurança</Text>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Pressable style={styles.cardAccordionHeader} onPress={() => setPwdExpanded((v) => !v)}>
              <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Alterar senha</Text>
              <Feather name={pwdExpanded ? "chevron-up" : "chevron-down"} size={15} color={colors.textMuted} />
            </Pressable>

            {pwdExpanded && (
              <>
                <View style={[styles.pwdFields, { marginTop: 16 }]}>
                  {[
                    { label: "Senha atual",          value: currentPwd,  setter: setCurrentPwd,  show: showCurrentPwd, toggle: () => setShowCurrentPwd((v) => !v) },
                    { label: "Nova senha",           value: newPwd,      setter: setNewPwd,      show: showNewPwd,     toggle: () => setShowNewPwd((v) => !v)     },
                    { label: "Confirmar nova senha", value: confirmPwd,  setter: setConfirmPwd,  show: showConfirmPwd, toggle: () => setShowConfirmPwd((v) => !v) },
                  ].map((f) => (
                    <View key={f.label} style={styles.pwdRow}>
                      <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{f.label}</Text>
                      <View style={[styles.pwdInputWrap, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                        <TextInput
                          style={[styles.pwdInput, { color: colors.text }]}
                          value={f.value}
                          onChangeText={f.setter}
                          secureTextEntry={!f.show}
                          placeholder="••••••••"
                          placeholderTextColor={colors.textDim}
                          autoCapitalize="none"
                        />
                        <Pressable onPress={f.toggle} hitSlop={10}>
                          <Feather name={f.show ? "eye-off" : "eye"} size={15} color={colors.textMuted} />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
                <Pressable
                  style={[styles.changePwdBtn, (!currentPwd || !newPwd || !confirmPwd || changingPwd) && styles.changePwdBtnDisabled]}
                  disabled={!currentPwd || !newPwd || !confirmPwd || changingPwd}
                  onPress={handleChangePassword}
                >
                  <Text style={styles.changePwdBtnText}>{changingPwd ? "Alterando..." : "Alterar senha"}</Text>
                </Pressable>
              </>
            )}
          </View>

          <View style={[styles.card, { marginTop: 10, backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>Autenticação em dois fatores</Text>
            <Text style={[styles.cardSub, { color: colors.textMuted }]}>Adicione uma camada extra de segurança à sua conta.</Text>
            <View style={styles.twoFaList}>
              <View style={styles.twoFaItem}>
                <View style={[styles.twoFaIcon, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}>
                  <Feather name="shield" size={16} color={colors.textSecondary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.twoFaLabel, { color: colors.textSecondary }]}>App autenticador</Text>
                  <Text style={[styles.twoFaSub, { color: colors.textMuted }]}>Google Authenticator, Authy...</Text>
                </View>
                <Pressable style={[styles.configureBtn, { borderColor: colors.inputBorder }]} onPress={() => showToast("Em breve disponível")}>
                  <Text style={[styles.configureBtnText, { color: colors.textMuted }]}>Configurar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* Zona de perigo */}
        <View style={styles.dangerSection}>
          <View style={styles.dangerHeader}>
            <Feather name="alert-triangle" size={14} color="#ff3b30" />
            <Text style={styles.dangerTitle}>Zona de perigo</Text>
          </View>
          <Text style={[styles.dangerDesc, { color: colors.textSecondary }]}>
            As ações abaixo são irreversíveis e afetam permanentemente sua conta.
          </Text>
          <Pressable style={styles.deleteBtn} onPress={() => setDeleteDialog(true)}>
            <Feather name="trash-2" size={15} color="#ff3b30" />
            <View style={{ flex: 1 }}>
              <Text style={styles.deleteBtnLabel}>Excluir minha conta</Text>
              <Text style={styles.deleteBtnSub}>Remove todos os seus dados, contratos e histórico permanentemente.</Text>
            </View>
            <Feather name="chevron-right" size={15} color="#ff3b3060" />
          </Pressable>
        </View>
      </ScrollView>

      <AppDialog
        visible={deleteDialog}
        title="Excluir conta?"
        message="Todos os seus dados, contratos e histórico serão removidos permanentemente. Esta ação não pode ser desfeita."
        buttons={[
          { text: "Cancelar", style: "cancel", onPress: () => setDeleteDialog(false) },
          { text: "Excluir", style: "destructive", onPress: () => { setDeleteDialog(false); logout(); } },
        ]}
        onDismiss={() => setDeleteDialog(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 28 },
  backBtn: { padding: 4 },
  headerTitle: { fontFamily: "Sora_700Bold", fontSize: 16 },
  avatarSection: { alignItems: "center", marginBottom: 28 },
  avatarWrap: { position: "relative" },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: 80, height: 80, borderRadius: 40, borderWidth: 2, borderColor: "#e0603030" },
  avatarText: { fontFamily: "DMSans_500Medium", fontSize: 24, color: "#e06030" },
  avatarEditBadge: { position: "absolute", bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: "#e06030", alignItems: "center", justifyContent: "center", borderWidth: 2 },
  avatarName: { fontFamily: "Sora_600SemiBold", fontSize: 16, marginTop: 12 },
  avatarActions: { flexDirection: "row", gap: 8, marginTop: 14 },
  avatarDiscardBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  avatarDiscardText: { fontFamily: "Sora_600SemiBold", fontSize: 12 },
  avatarSaveBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: "#e06030" },
  avatarSaveText: { fontFamily: "Sora_600SemiBold", fontSize: 12, color: "#fff" },
  section: { marginBottom: 28 },
  sectionTitle: { fontFamily: "DMSans_500Medium", fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 },
  fieldList: { borderRadius: 24, borderWidth: 1, overflow: "hidden" },
  fieldRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  fieldMeta: { flex: 1 },
  fieldLabel: { fontFamily: "DMSans_400Regular", fontSize: 10, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3 },
  fieldValue: { fontFamily: "Sora_400Regular", fontSize: 14 },
  fieldInput: { fontFamily: "Sora_400Regular", fontSize: 14, padding: 0 },
  editActions: { flexDirection: "row", gap: 8, marginLeft: 8 },
  cancelBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
  cancelBtnText: { fontFamily: "Sora_600SemiBold", fontSize: 11 },
  saveBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "#e06030" },
  saveBtnText: { fontFamily: "Sora_600SemiBold", fontSize: 11, color: "#fff" },
  editIconBtn: { padding: 6 },
  fieldActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  eyeBtn: { padding: 6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  statusBadgeText: { fontFamily: "DMSans_500Medium", fontSize: 10, letterSpacing: 0.5 },
  verifBlock: { borderRadius: 24, borderWidth: 1, overflow: "hidden" },
  verifBlockHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  verifIconWrap: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  verifBlockTitle: { fontFamily: "Sora_600SemiBold", fontSize: 13 },
  verifBlockSub: { fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 2 },
  verifContent: { padding: 12, paddingTop: 0 },
  submitVerifBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, alignSelf: "flex-start" },
  submitVerifBtnText: { fontFamily: "Sora_600SemiBold", fontSize: 12 },
  docList: { borderTopWidth: 1, marginHorizontal: 16, marginBottom: 12 },
  docDivider: { height: 1 },
  docItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  docItemIcon: { width: 30, height: 30, borderRadius: 8, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  docItemType: { fontFamily: "Sora_600SemiBold", fontSize: 12 },
  docItemMeta: { fontFamily: "DMSans_400Regular", fontSize: 10, marginTop: 2 },
  docEmpty: { alignItems: "center", gap: 8, paddingVertical: 20, borderTopWidth: 1 },
  docEmptyText: { fontFamily: "DMSans_400Regular", fontSize: 12 },
  rejectedMsg: { flexDirection: "row", alignItems: "flex-start", gap: 8, marginHorizontal: 16, marginBottom: 12, padding: 10, backgroundColor: "#ff3b3010", borderRadius: 8, borderWidth: 1, borderColor: "#ff3b3025" },
  rejectedMsgText: { fontFamily: "DMSans_400Regular", fontSize: 11, color: "#ff3b30", flex: 1, lineHeight: 16 },
  card: { borderRadius: 24, borderWidth: 1, padding: 16 },
  cardAccordionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontFamily: "Sora_600SemiBold", fontSize: 13 },
  cardSub: { fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 4, lineHeight: 16 },
  pwdFields: { gap: 12 },
  pwdRow: { gap: 6 },
  pwdInputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, height: 44, gap: 8 },
  pwdInput: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 14 },
  changePwdBtn: { marginTop: 16, backgroundColor: "#e06030", borderRadius: 10, paddingVertical: 11, alignItems: "center" },
  changePwdBtnDisabled: { opacity: 0.3 },
  changePwdBtnText: { fontFamily: "Sora_600SemiBold", fontSize: 13, color: "#fff" },
  twoFaList: { marginTop: 14, gap: 0 },
  twoFaItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  twoFaIcon: { width: 36, height: 36, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  twoFaLabel: { fontFamily: "Sora_600SemiBold", fontSize: 13 },
  twoFaSub: { fontFamily: "DMSans_400Regular", fontSize: 11, marginTop: 2 },
  configureBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  configureBtnText: { fontFamily: "Sora_600SemiBold", fontSize: 11 },
  dangerSection: { borderWidth: 1, borderColor: "#ff3b3020", borderRadius: 24, padding: 16, backgroundColor: "#ff3b3008", marginBottom: 20 },
  dangerHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  dangerTitle: { fontFamily: "Sora_700Bold", fontSize: 13, color: "#ff3b30" },
  dangerDesc: { fontFamily: "DMSans_400Regular", fontSize: 11, lineHeight: 16, marginBottom: 14 },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#ff3b3010", borderWidth: 1, borderColor: "#ff3b3020", borderRadius: 12, padding: 14 },
  deleteBtnLabel: { fontFamily: "Sora_600SemiBold", fontSize: 13, color: "#ff3b30" },
  deleteBtnSub: { fontFamily: "DMSans_400Regular", fontSize: 11, color: "#ff3b3070", marginTop: 2, lineHeight: 15 },
});
