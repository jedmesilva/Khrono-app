import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Animated,
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
import { DocStatus, useDocuments } from "@/context/DocumentsContext";

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

  const toastAnim = useRef(new Animated.Value(-80)).current;
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const [editing, setEditing] = useState<EditingField>(null);
  const [draft, setDraft] = useState("");

  const [userData, setUserData] = useState({
    nome: "Jedme Silva",
    email: "jedme@email.com",
    telefone: "(31) 99999-1234",
    cpf: "123.456.789-00",
    nascimento: "15/04/1990",
  });

  const { documents } = useDocuments();
  const [faceStatus, setFaceStatus] = useState<VerifStatus>("rejected");

  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");

  const [deleteDialog, setDeleteDialog] = useState(false);

  const [pwdExpanded, setPwdExpanded] = useState(false);

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
    setDraft(field === "cpf" ? userData.cpf : val);
    setEditing(field);
  }

  function saveEdit() {
    if (!editing) return;
    setUserData((prev) => ({ ...prev, [editing]: draft }));
    setEditing(null);
    showToast("Alteração salva com sucesso");
  }

  function cancelEdit() {
    setEditing(null);
    setDraft("");
  }

  const FIELDS: { key: keyof typeof userData; label: string; masked?: boolean; placeholder: string }[] = [
    { key: "nome",       label: "Nome completo",    placeholder: "Seu nome completo"    },
    { key: "email",      label: "E-mail",           placeholder: "seu@email.com"        },
    { key: "telefone",   label: "Telefone",         placeholder: "(00) 00000-0000"      },
    { key: "cpf",        label: "CPF",              masked: true, placeholder: "000.000.000-00" },
    { key: "nascimento", label: "Data de nascimento", placeholder: "DD/MM/AAAA"         },
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
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JS</Text>
          </View>
          <Text style={styles.avatarName}>{userData.nome}</Text>
          <Text style={styles.avatarEmail}>{userData.email}</Text>
        </View>

        {/* ── Dados pessoais ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dados pessoais</Text>

          <View style={styles.fieldList}>
            {FIELDS.map((f) => {
              const isEditing = editing === f.key;
              const displayValue = f.masked && editing !== f.key
                ? "•••.•••.•••-••"
                : userData[f.key];

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
                      />
                    ) : (
                      <Text style={styles.fieldValue}>{displayValue}</Text>
                    )}
                  </View>

                  {isEditing ? (
                    <View style={styles.editActions}>
                      <Pressable style={styles.cancelBtn} onPress={cancelEdit}>
                        <Text style={styles.cancelBtnText}>Cancelar</Text>
                      </Pressable>
                      <Pressable style={styles.saveBtn} onPress={saveEdit}>
                        <Text style={styles.saveBtnText}>Salvar</Text>
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

          {/* Documento */}
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

          {/* Reconhecimento facial */}
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

          {/* Troca de senha */}
          <View style={styles.card}>
            <Pressable style={styles.cardAccordionHeader} onPress={() => setPwdExpanded((v) => !v)}>
              <View style={styles.cardAccordionLeft}>
                <Feather name="lock" size={15} color="#555" />
                <Text style={styles.cardTitle}>Alterar senha</Text>
              </View>
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
                    (!currentPwd || !newPwd || !confirmPwd) && styles.changePwdBtnDisabled,
                  ]}
                  disabled={!currentPwd || !newPwd || !confirmPwd}
                  onPress={() => {
                    setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
                    setPwdExpanded(false);
                    showToast("Senha alterada com sucesso");
                  }}
                >
                  <Text style={styles.changePwdBtnText}>Alterar senha</Text>
                </Pressable>
              </>
            )}
          </View>

          {/* 2FA */}
          <View style={[styles.card, { marginTop: 10 }]}>
            <Text style={styles.cardTitle}>Autenticação em dois fatores</Text>
            <Text style={styles.cardSub}>
              Adicione uma camada extra de segurança à sua conta.
            </Text>

            <View style={styles.twoFaList}>
              {/* SMS - ativo */}
              <View style={styles.twoFaItem}>
                <View style={[styles.twoFaIcon, { borderColor: Colors.accentGreen + "30", backgroundColor: Colors.accentGreen + "10" }]}>
                  <Feather name="message-circle" size={16} color={Colors.accentGreen} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.twoFaLabel}>SMS</Text>
                  <Text style={styles.twoFaSub}>(31) 99999-••••</Text>
                </View>
                <View style={styles.twoFaActiveBadge}>
                  <Text style={styles.twoFaActiveBadgeText}>ativo</Text>
                </View>
              </View>

              <View style={styles.twoFaDivider} />

              {/* Authenticator app */}
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
          { text: "Excluir", style: "destructive", onPress: () => setDeleteDialog(false) },
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
    gap: 6,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#161616",
    borderWidth: 2,
    borderColor: Colors.accent + "30",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  avatarText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 22,
    color: Colors.accent,
    fontWeight: "700",
  },
  avatarName: {
    fontFamily: "Sora_700Bold",
    fontSize: 18,
    color: "#fff",
  },
  avatarEmail: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#444",
  },

  section: { marginBottom: 28 },
  sectionTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 14,
    color: "#fff",
    marginBottom: 14,
  },

  fieldList: { gap: 10 },
  fieldRow: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  fieldRowEditing: {
    borderColor: Colors.accent + "50",
    backgroundColor: Colors.accent + "05",
  },
  fieldMeta: { flex: 1 },
  fieldLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  fieldValue: {
    fontFamily: "Sora_400Regular",
    fontSize: 14,
    color: "#ccc",
  },
  fieldInput: {
    fontFamily: "Sora_400Regular",
    fontSize: 14,
    color: "#fff",
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.accent + "40",
  },
  editIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#222",
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#222",
    borderRadius: 10,
  },
  cancelBtnText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#555",
  },
  saveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Colors.accent,
    borderRadius: 10,
  },
  saveBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 12,
    color: "#fff",
  },

  statusBadge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 9,
    letterSpacing: 0.3,
  },

  verifBlock: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    overflow: "hidden",
  },
  verifBlockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  verifIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#161616",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  verifBlockTitle: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: "#fff",
    marginBottom: 2,
  },
  verifBlockSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#444",
  },
  rejectedMsg: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#ff3b3010",
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#ff3b3020",
  },
  rejectedMsgText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#ff3b30cc",
    flex: 1,
    lineHeight: 15,
  },
  verifContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#141414",
    paddingTop: 14,
    gap: 12,
  },
  verifLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#444",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  docTypeRow: {
    flexDirection: "row",
    gap: 8,
  },
  docTypeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#0d0d0d",
  },
  docTypeBtnActive: {
    borderColor: Colors.accent + "50",
    backgroundColor: Colors.accent + "10",
  },
  docTypeBtnText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 11,
    color: "#444",
  },
  docTypeBtnTextActive: {
    color: Colors.accent,
  },
  uploadRow: {
    flexDirection: "row",
    gap: 8,
  },
  uploadBtn: {
    flex: 1,
    paddingVertical: 18,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 12,
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0d0d0d",
    borderStyle: "dashed",
  },
  uploadBtnDone: {
    borderColor: Colors.accentGreen + "40",
    backgroundColor: Colors.accentGreen + "08",
    borderStyle: "solid",
  },
  uploadBtnText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
  },
  submitVerifBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitVerifBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
  },

  docList: {
    borderTopWidth: 1,
    borderTopColor: "#111",
  },
  docDivider: {
    height: 1,
    backgroundColor: "#111",
  },
  docItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  docItemIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
  },
  docItemType: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#ccc",
    marginBottom: 2,
  },
  docItemMeta: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#444",
  },
  docEmpty: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#111",
  },
  docEmptyText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#333",
  },

  faceGuide: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  faceOval: {
    width: 100,
    height: 120,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: Colors.accent + "40",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
  },
  faceGuideText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    textAlign: "center",
    lineHeight: 17,
    maxWidth: 220,
  },

  card: {
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#161616",
    borderRadius: 16,
    padding: 18,
  },
  cardAccordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardAccordionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  cardTitle: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },
  cardSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    lineHeight: 16,
    marginTop: 4,
    marginBottom: 16,
  },
  pwdFields: { gap: 14, marginBottom: 16 },
  pwdRow: { gap: 6 },
  pwdInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 10,
  },
  pwdInput: {
    flex: 1,
    fontFamily: "DMMono_400Regular",
    fontSize: 14,
    color: "#fff",
    paddingVertical: 0,
  },
  changePwdBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
  },
  changePwdBtnDisabled: { opacity: 0.35 },
  changePwdBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: "#fff",
  },

  twoFaList: {},
  twoFaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
  },
  twoFaDivider: {
    height: 1,
    backgroundColor: "#141414",
  },
  twoFaIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  twoFaLabel: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
    marginBottom: 2,
  },
  twoFaSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#444",
  },
  twoFaActiveBadge: {
    backgroundColor: Colors.accentGreen + "15",
    borderWidth: 1,
    borderColor: Colors.accentGreen + "30",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  twoFaActiveBadgeText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 9,
    color: Colors.accentGreen,
  },
  configureBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 10,
  },
  configureBtnText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#555",
  },

  dangerSection: {
    backgroundColor: "#ff3b3008",
    borderWidth: 1,
    borderColor: "#ff3b3020",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
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
    borderColor: "#ff3b3025",
    borderRadius: 12,
    padding: 14,
  },
  deleteBtnLabel: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#ff3b30",
    marginBottom: 3,
  },
  deleteBtnSub: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#ff3b3080",
    lineHeight: 14,
  },
});
