import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
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
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import { DocStatus, useDocuments } from "@/context/DocumentsContext";
import { supabase } from "@/lib/supabase";

type VerifStatus = "none" | "pending" | "approved" | "rejected";
type EditingField = "nome" | "email" | "telefone" | "cpf" | "nascimento" | null;

const STATUS_COLORS: Record<VerifStatus, { bg: string; border: string; text: string; label: string }> = {
  none:     { bg: "#111",                    border: "#1e1e1e",              text: "#444",           label: "Não enviado" },
  pending:  { bg: Colors.accent + "12",      border: Colors.accent + "30",   text: Colors.accent,    label: "Em análise"  },
  approved: { bg: Colors.accentGreen + "12", border: Colors.accentGreen + "30", text: Colors.accentGreen, label: "Aprovado" },
  rejected: { bg: "#ff3b3015",              border: "#ff3b3030",            text: "#ff3b30",        label: "Reprovado"  },
};

const DOC_STATUS_COLORS: Record<DocStatus, { bg: string; border: string; text: string; label: string }> = {
  analise:    { bg: Colors.accent + "12",      border: Colors.accent + "30",        text: Colors.accent,      label: "Em análise"  },
  verificado: { bg: Colors.accentGreen + "12", border: Colors.accentGreen + "30",   text: Colors.accentGreen, label: "Verificado"  },
  invalido:   { bg: "#ff3b3015",               border: "#ff3b3030",                 text: "#ff3b30",          label: "Inválido"    },
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
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg, borderColor: s.border }]}>
      <Text style={[styles.statusBadgeText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

function Toast({ visible, message, translateY }: { visible: boolean; message: string; translateY: Animated.Value }) {
  if (!visible) return null;
  return (
    <Animated.View style={[styles.toast, { transform: [{ translateY }] }]}>
      <Feather name="check-circle" size={14} color="#fff" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
}

export default function ContaScreen() {
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === "web";
  const topPadding = isWeb ? insets.top + 67 : insets.top;
  const { user, refreshUser, logout } = useAuth();

  const toastAnim = useRef(new Animated.Value(-80)).current;
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [editing, setEditing] = useState<EditingField>(null);
  const [draft, setDraft] = useState("");
  const [savingField, setSavingField] = useState(false);

  const [userData, setUserData] = useState({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    nascimento: "",
  });
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

  const [deleteDialog, setDeleteDialog] = useState(false);
  const [pwdExpanded, setPwdExpanded] = useState(false);

  // Load real profile from Supabase
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
          cpf: data.cpf ?? "",
          nascimento: data.birth_date ?? "",
        });
        if (data.profile_image_url) setProfileImage(data.profile_image_url);
      }
      setLoadingProfile(false);
    }
    loadProfile();
  }, [user?.id]);

  function showToast(msg: string) {
    setToastMsg(msg);
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: -80, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  }

  function startEdit(field: EditingField) {
    const val = field ? userData[field] : "";
    setDraft(val);
    setEditing(field);
  }

  async function saveEdit() {
    if (!editing || !user?.id) return;
    setSavingField(true);

    // Build the update payload for Supabase
    const dbField: Record<string, string> = {
      nome: "name",
      email: "email",
      telefone: "phone",
      cpf: "cpf",
      nascimento: "birth_date",
    };

    let valueToSave = draft;
    // Normalize phone back to +55XXXXXXXXXXX
    if (editing === "telefone") {
      const digits = draft.replace(/\D/g, "");
      valueToSave = digits ? `+55${digits}` : "";
    }

    const { error } = await supabase
      .from("profiles")
      .update({ [dbField[editing]]: valueToSave })
      .eq("id", user.id);

    setSavingField(false);

    if (error) {
      Alert.alert("Erro", "Não foi possível salvar. Tente novamente.");
      return;
    }

    setUserData((prev) => ({ ...prev, [editing]: draft }));
    setEditing(null);
    await refreshUser();
    showToast("Alteração salva com sucesso");
  }

  function cancelEdit() {
    setEditing(null);
    setDraft("");
  }

  async function pickProfileImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setPendingImage(result.assets[0].uri);
    }
  }

  function saveProfileImage() {
    setProfileImage(pendingImage);
    setPendingImage(null);
    showToast("Foto de perfil atualizada");
    // TODO: upload to Supabase Storage when configured
  }

  function discardProfileImage() {
    setPendingImage(null);
  }

  async function handleChangePassword() {
    if (!currentPwd || !newPwd || !confirmPwd) return;
    if (newPwd !== confirmPwd) {
      Alert.alert("Erro", "A nova senha e a confirmação não coincidem.");
      return;
    }
    if (newPwd.length < 6) {
      Alert.alert("Erro", "A nova senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setChangingPwd(true);

    // Verify current password by trying to sign in
    const email = userData.email || user?.contact || "";
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPwd,
    });

    if (signInError) {
      setChangingPwd(false);
      Alert.alert("Senha incorreta", "A senha atual informada está errada.");
      return;
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({ password: newPwd });

    setChangingPwd(false);

    if (updateError) {
      Alert.alert("Erro", updateError.message);
      return;
    }

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
    <View style={[styles.container, { backgroundColor: Colors.background }]}>
      <Toast visible={toastVisible} message={toastMsg} translateY={toastAnim} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPadding + 16, paddingBottom: isWeb ? 34 + 84 + 20 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={18} color={Colors.accent} />
          </Pressable>
          <Text style={styles.headerTitle}>Minha conta</Text>
          <View style={{ width: 26 }} />
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <Pressable style={styles.avatarWrap} onPress={pickProfileImage}>
            {pendingImage || profileImage ? (
              <Image source={{ uri: pendingImage ?? profileImage! }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Feather name="camera" size={11} color="#fff" />
            </View>
          </Pressable>

          {!loadingProfile && userData.nome ? (
            <Text style={styles.avatarName}>{userData.nome}</Text>
          ) : null}

          {pendingImage && (
            <View style={styles.avatarActions}>
              <Pressable style={styles.avatarDiscardBtn} onPress={discardProfileImage}>
                <Feather name="x" size={13} color="#666" />
                <Text style={styles.avatarDiscardText}>Descartar</Text>
              </Pressable>
              <Pressable style={styles.avatarSaveBtn} onPress={saveProfileImage}>
                <Feather name="check" size={13} color="#fff" />
                <Text style={styles.avatarSaveText}>Salvar foto</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* ── Dados pessoais ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados pessoais</Text>

          <View style={styles.fieldList}>
            {FIELDS.map((f) => {
              const isEditing = editing === f.key;
              const displayValue = f.masked && editing !== f.key && userData[f.key]
                ? "•••.•••.•••-••"
                : (userData[f.key] || (loadingProfile ? "Carregando..." : "Não informado"));

              return (
                <View
                  key={f.key}
                  style={[styles.fieldRow, isEditing && styles.fieldRowEditing]}
                >
                  <View style={styles.fieldMeta}>
                    <Text style={styles.fieldLabel}>{f.label}</Text>
                    {isEditing ? (
                      <TextInput
                        style={styles.fieldInput}
                        value={draft}
                        onChangeText={setDraft}
                        placeholder={f.placeholder}
                        placeholderTextColor="#333"
                        autoCapitalize="none"
                        autoFocus
                        keyboardType={f.key === "telefone" ? "phone-pad" : f.key === "nascimento" ? "numeric" : "default"}
                      />
                    ) : (
                      <Text style={[styles.fieldValue, !userData[f.key] && styles.fieldValueEmpty]}>
                        {displayValue}
                      </Text>
                    )}
                  </View>

                  {isEditing ? (
                    <View style={styles.editActions}>
                      <Pressable style={styles.cancelBtn} onPress={cancelEdit} disabled={savingField}>
                        <Text style={styles.cancelBtnText}>Cancelar</Text>
                      </Pressable>
                      <Pressable style={styles.saveBtn} onPress={saveEdit} disabled={savingField}>
                        <Text style={styles.saveBtnText}>{savingField ? "..." : "Salvar"}</Text>
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable style={styles.editIconBtn} onPress={() => startEdit(f.key)}>
                      <Feather name="edit-2" size={13} color="#666" />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Verificação de identidade ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verificação de identidade</Text>

          <View style={styles.verifBlock}>
            <View style={styles.verifBlockHeader}>
              <View style={[styles.verifIconWrap, { borderColor: "#1e1e1e" }]}>
                <Feather name="file-text" size={16} color="#555" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.verifBlockTitle}>Documentos</Text>
                <Text style={styles.verifBlockSub}>RG, CNH ou Passaporte</Text>
              </View>
            </View>

            {documents.length > 0 && (
              <View style={styles.docList}>
                {documents.map((doc, index) => (
                  <View key={doc.id}>
                    {index > 0 && <View style={styles.docDivider} />}
                    <View style={styles.docItem}>
                      <View style={styles.docItemIcon}>
                        <Feather name="file-text" size={14} color="#555" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.docItemType}>{doc.type}</Text>
                        <Text style={styles.docItemMeta}>
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
              <View style={styles.docEmpty}>
                <Feather name="inbox" size={22} color="#222" />
                <Text style={styles.docEmptyText}>Nenhum documento enviado</Text>
              </View>
            )}

            <View style={styles.verifContent}>
              <Pressable
                style={styles.submitVerifBtn}
                onPress={() => router.push("/envio-documento")}
              >
                <Feather name="upload" size={14} color="#fff" />
                <Text style={styles.submitVerifBtnText}>Enviar documento</Text>
              </Pressable>
            </View>
          </View>

          <View style={[styles.verifBlock, { marginTop: 10 }]}>
            <View style={styles.verifBlockHeader}>
              <View style={[styles.verifIconWrap, { borderColor: "#1e1e1e" }]}>
                <Feather name="aperture" size={16} color="#555" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.verifBlockTitle}>Reconhecimento facial</Text>
                <Text style={styles.verifBlockSub}>Verificação com liveness</Text>
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
                <Pressable
                  style={styles.submitVerifBtn}
                  onPress={() => router.push("/verificacao-facial")}
                >
                  <Feather name="video" size={14} color="#fff" />
                  <Text style={styles.submitVerifBtnText}>Fazer reconhecimento facial</Text>
                </Pressable>
              </View>
            )}
          </View>
        </View>

        {/* ── Segurança ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Segurança</Text>

          <View style={styles.card}>
            <Pressable style={styles.cardAccordionHeader} onPress={() => setPwdExpanded((v) => !v)}>
              <Text style={styles.cardTitle}>Alterar senha</Text>
              <Feather name={pwdExpanded ? "chevron-up" : "chevron-down"} size={15} color="#333" />
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
                      <Text style={styles.fieldLabel}>{f.label}</Text>
                      <View style={styles.pwdInputWrap}>
                        <TextInput
                          style={styles.pwdInput}
                          value={f.value}
                          onChangeText={f.setter}
                          secureTextEntry={!f.show}
                          placeholder="••••••••"
                          placeholderTextColor="#333"
                          autoCapitalize="none"
                        />
                        <Pressable onPress={f.toggle} hitSlop={10}>
                          <Feather name={f.show ? "eye-off" : "eye"} size={15} color="#444" />
                        </Pressable>
                      </View>
                    </View>
                  ))}
                </View>
                <Pressable
                  style={[
                    styles.changePwdBtn,
                    (!currentPwd || !newPwd || !confirmPwd || changingPwd) && styles.changePwdBtnDisabled,
                  ]}
                  disabled={!currentPwd || !newPwd || !confirmPwd || changingPwd}
                  onPress={handleChangePassword}
                >
                  <Text style={styles.changePwdBtnText}>
                    {changingPwd ? "Alterando..." : "Alterar senha"}
                  </Text>
                </Pressable>
              </>
            )}
          </View>

          <View style={[styles.card, { marginTop: 10 }]}>
            <Text style={styles.cardTitle}>Autenticação em dois fatores</Text>
            <Text style={styles.cardSub}>
              Adicione uma camada extra de segurança à sua conta.
            </Text>

            <View style={styles.twoFaList}>
              <View style={styles.twoFaItem}>
                <View style={[styles.twoFaIcon, { borderColor: "#1e1e1e", backgroundColor: "#161616" }]}>
                  <Feather name="shield" size={16} color="#555" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.twoFaLabel}>App autenticador</Text>
                  <Text style={styles.twoFaSub}>Google Authenticator, Authy...</Text>
                </View>
                <Pressable
                  style={styles.configureBtn}
                  onPress={() => showToast("Em breve disponível")}
                >
                  <Text style={styles.configureBtnText}>Configurar</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* ── Zona de perigo ── */}
        <View style={styles.dangerSection}>
          <View style={styles.dangerHeader}>
            <Feather name="alert-triangle" size={14} color="#ff3b30" />
            <Text style={styles.dangerTitle}>Zona de perigo</Text>
          </View>
          <Text style={styles.dangerDesc}>
            As ações abaixo são irreversíveis e afetam permanentemente sua conta.
          </Text>

          <Pressable style={styles.deleteBtn} onPress={() => setDeleteDialog(true)}>
            <Feather name="trash-2" size={15} color="#ff3b30" />
            <View style={{ flex: 1 }}>
              <Text style={styles.deleteBtnLabel}>Excluir minha conta</Text>
              <Text style={styles.deleteBtnSub}>
                Remove todos os seus dados, contratos e histórico permanentemente.
              </Text>
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

  toast: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    zIndex: 999,
    backgroundColor: Colors.accentGreen,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
    flex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
  },
  backBtn: { padding: 4 },
  headerTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 16,
    color: "#fff",
  },

  avatarSection: {
    alignItems: "center",
    marginBottom: 28,
  },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#161616",
    borderWidth: 2,
    borderColor: Colors.accent + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.accent + "30",
  },
  avatarText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 24,
    color: Colors.accent,
    fontWeight: "700",
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.background,
  },
  avatarName: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 16,
    color: "#fff",
    marginTop: 12,
  },
  avatarActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  avatarDiscardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#222",
    backgroundColor: "#0a0a0a",
  },
  avatarDiscardText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 12,
    color: "#555",
  },
  avatarSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.accent,
  },
  avatarSaveText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 12,
    color: "#fff",
  },

  section: { marginBottom: 28 },
  sectionTitle: {
    fontFamily: "DMMono_500Medium",
    fontSize: 11,
    color: "#444",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 12,
  },

  fieldList: {
    backgroundColor: "#0d0d0d",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#181818",
    overflow: "hidden",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#141414",
  },
  fieldRowEditing: {
    backgroundColor: "#111",
    borderBottomColor: Colors.accent + "20",
  },
  fieldMeta: { flex: 1 },
  fieldLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#444",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  fieldValue: {
    fontFamily: "Sora_400Regular",
    fontSize: 14,
    color: "#ccc",
  },
  fieldValueEmpty: { color: "#333" },
  fieldInput: {
    fontFamily: "Sora_400Regular",
    fontSize: 14,
    color: "#fff",
    padding: 0,
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 8,
  },
  cancelBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#222",
  },
  cancelBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 11,
    color: "#555",
  },
  saveBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: Colors.accent,
  },
  saveBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 11,
    color: "#fff",
  },
  editIconBtn: { padding: 6 },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 10,
    letterSpacing: 0.5,
  },

  verifBlock: {
    backgroundColor: "#0d0d0d",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#181818",
    overflow: "hidden",
  },
  verifBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  verifIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    backgroundColor: "#111",
    alignItems: "center",
    justifyContent: "center",
  },
  verifBlockTitle: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#ccc",
  },
  verifBlockSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    marginTop: 2,
  },
  verifContent: {
    padding: 12,
    paddingTop: 0,
  },
  submitVerifBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#161616",
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  submitVerifBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 12,
    color: "#fff",
  },
  docList: {
    borderTopWidth: 1,
    borderTopColor: "#141414",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  docDivider: { height: 1, backgroundColor: "#141414" },
  docItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  docItemIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
  },
  docItemType: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 12,
    color: "#ccc",
  },
  docItemMeta: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#444",
    marginTop: 2,
  },
  docEmpty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#141414",
  },
  docEmptyText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#333",
  },
  rejectedMsg: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 10,
    backgroundColor: "#ff3b3010",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ff3b3025",
  },
  rejectedMsgText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#ff3b30",
    flex: 1,
    lineHeight: 16,
  },

  card: {
    backgroundColor: "#0d0d0d",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#181818",
    padding: 16,
  },
  cardAccordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#ccc",
  },
  cardSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    marginTop: 4,
    lineHeight: 16,
  },
  pwdFields: { gap: 12 },
  pwdRow: { gap: 6 },
  pwdInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  pwdInput: {
    flex: 1,
    fontFamily: "DMMono_400Regular",
    fontSize: 14,
    color: "#fff",
  },
  changePwdBtn: {
    marginTop: 16,
    backgroundColor: Colors.accent,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  changePwdBtnDisabled: { opacity: 0.3 },
  changePwdBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },

  twoFaList: { marginTop: 14, gap: 0 },
  twoFaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 4,
  },
  twoFaIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  twoFaLabel: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#ccc",
  },
  twoFaSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    marginTop: 2,
  },
  twoFaActiveBadge: {
    backgroundColor: Colors.accentGreen + "15",
    borderWidth: 1,
    borderColor: Colors.accentGreen + "30",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  twoFaActiveBadgeText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 10,
    color: Colors.accentGreen,
  },
  twoFaDivider: { height: 1, backgroundColor: "#141414", marginVertical: 10 },
  configureBtn: {
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  configureBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 11,
    color: "#555",
  },

  dangerSection: {
    borderWidth: 1,
    borderColor: "#ff3b3020",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#ff3b3008",
    marginBottom: 20,
  },
  dangerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  dangerTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 13,
    color: "#ff3b30",
  },
  dangerDesc: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#555",
    lineHeight: 16,
    marginBottom: 14,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#ff3b3010",
    borderWidth: 1,
    borderColor: "#ff3b3020",
    borderRadius: 12,
    padding: 14,
  },
  deleteBtnLabel: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#ff3b30",
  },
  deleteBtnSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#ff3b3070",
    marginTop: 2,
    lineHeight: 15,
  },
});
