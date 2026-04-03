import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, AppDialogButton } from "@/components/AppDialog";
import Colors from "@/constants/colors";
import { ProviderData, useConfirmation } from "@/context/ConfirmationContext";

type DialogState = { title: string; message?: string; buttons?: AppDialogButton[] } | null;

const MOCK_PROVIDERS: Record<string, ProviderData> = {
  "1234": {
    name: "Carlos Mendes",
    initials: "CM",
    nota: 4.8,
    avaliacoes: 42,
    distancia: 0.8,
    valorBase: 45,
    totalContracts: 87,
    profileId: "p-1234",
    services: [
      { id: 1, nome: "Pintura Residencial", multiplicador: 1.0, avaliacoes: 42, nota: 4.8, skill: "Pintor", tools: ["Rolo 23cm", "Escada 6m"] },
      { id: 2, nome: "Gessaria", multiplicador: 0.9, avaliacoes: 8, nota: 4.5, skill: "Gesseiro", tools: ["Desempenadeira", "Misturador"] },
    ],
  },
  "5678": {
    name: "Juliana Rocha",
    initials: "JR",
    nota: 5.0,
    avaliacoes: 128,
    distancia: 2.1,
    valorBase: 80,
    totalContracts: 152,
    profileId: "p-5678",
    services: [
      { id: 1, nome: "Personal Training", multiplicador: 1.0, avaliacoes: 128, nota: 5.0, skill: "Personal Trainer", tools: ["Kit de Treino"] },
      { id: 2, nome: "Consultoria Nutricional", multiplicador: 1.2, avaliacoes: 34, nota: 4.9, skill: "Nutricionista" },
    ],
  },
  "9012": {
    name: "Pedro Alves",
    initials: "PA",
    nota: 4.7,
    avaliacoes: 31,
    distancia: 3.4,
    valorBase: 60,
    totalContracts: 45,
    profileId: "p-9012",
    services: [
      { id: 1, nome: "Instalação Elétrica", multiplicador: 1.0, avaliacoes: 31, nota: 4.7, skill: "Eletricista", tools: ["Alicate Amperímetro", "Kit Cabos"] },
      { id: 2, nome: "Manutenção Elétrica", multiplicador: 0.9, avaliacoes: 12, nota: 4.6, skill: "Eletricista", tools: ["Alicate Amperímetro"] },
    ],
  },
  "4321": {
    name: "Isabela Martins",
    initials: "IM",
    nota: 4.9,
    avaliacoes: 77,
    distancia: 0.5,
    valorBase: 40,
    totalContracts: 94,
    profileId: "p-4321",
    services: [
      { id: 1, nome: "Cuidados com Idosos", multiplicador: 1.0, avaliacoes: 77, nota: 4.9, skill: "Cuidadora" },
      { id: 2, nome: "Acompanhamento Hospitalar", multiplicador: 1.3, avaliacoes: 22, nota: 4.8, skill: "Cuidadora", tools: ["Cadeira de Rodas"] },
    ],
  },
  "1257": {
    name: "Jedme Silva",
    initials: "JS",
    nota: 4.6,
    avaliacoes: 19,
    distancia: 1.8,
    valorBase: 50,
    totalContracts: 43,
    profileId: "p-1257",
    services: [
      { id: 1, nome: "Montagem de Móveis", multiplicador: 1.0, avaliacoes: 19, nota: 4.6, skill: "Montador de Móveis", tools: ["Honda Civic 2019", "Kit Furadeira Bosch"] },
      { id: 2, nome: "Desmontagem e Transporte", multiplicador: 0.85, avaliacoes: 7, nota: 4.4, skill: "Carregador / Mudanças", tools: ["Honda Civic 2019"] },
    ],
  },
};

type HireMethod = "PINCODE" | "QRCODE" | "NFC" | "LINK";
type Props = { open: boolean; onClose: () => void };

const KEYPAD_ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "del"],
];

// ─── PINCODE ────────────────────────────────────────────────────────────────

function PincodeContent({
  onFoundProvider,
  onShowDialog,
}: {
  onFoundProvider: (p: ProviderData) => void;
  onShowDialog: (d: DialogState) => void;
}) {
  const [pin, setPin] = useState("");
  const [found, setFound] = useState<ProviderData | null>(null);

  const handleKey = (d: string) => {
    if (d === "del") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (pin.length < 6) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPin((p) => p + d);
    }
  };

  const handleConnect = () => {
    const provider = MOCK_PROVIDERS[pin];
    if (provider) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFound(provider);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onShowDialog({ title: "PIN não encontrado", message: "Verifique o código e tente novamente." });
    }
  };

  const handleContinue = () => {
    if (!found) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onFoundProvider(found);
  };

  if (found) {
    return (
      <View>
        <Text style={sub.title}>Prestador encontrado</Text>
        <View style={sub.userCard}>
          <View style={sub.userAvatar}>
            <Text style={sub.userAvatarText}>{found.initials}</Text>
          </View>
          <Text style={sub.userName}>{found.name}</Text>
          <View style={sub.infoChipsRow}>
            <View style={sub.infoChip}>
              <Feather name="briefcase" size={10} color="#555" />
              <Text style={sub.infoChipText}>{found.totalContracts ?? 0} contratos</Text>
            </View>
            <View style={sub.infoChip}>
              <Feather name="tool" size={10} color="#555" />
              <Text style={sub.infoChipText}>{found.services.length} {found.services.length === 1 ? "service" : "services"}</Text>
            </View>
          </View>
        </View>
        <Text style={sub.confirmDesc}>
          Confirme o prestador para definir os detalhes do contrato.
        </Text>
        <Pressable style={sub.primaryBtn} onPress={handleContinue}>
          <Feather name="arrow-right" size={16} color="#fff" />
          <Text style={sub.primaryBtnText}>Configurar contrato</Text>
        </Pressable>
        <Pressable style={sub.ghostBtn} onPress={() => setFound(null)}>
          <Text style={sub.ghostBtnText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <Text style={sub.title}>Inserir PINCODE</Text>
      <Text style={sub.desc}>Digite o código do prestador para iniciar o contrato</Text>

      <View style={sub.pinRow}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={[sub.pinDigit, pin.length > i && sub.pinDigitFilled]}>
            <Text style={sub.pinDigitText}>{pin[i] ?? ""}</Text>
          </View>
        ))}
      </View>

      <View style={sub.keypadGrid}>
        {KEYPAD_ROWS.map((row, ri) => (
          <View key={ri} style={sub.keypadRow}>
            {row.map((d, ci) => (
              <Pressable
                key={ci}
                onPress={() => d && handleKey(d)}
                style={({ pressed }) => [
                  sub.keypadBtn,
                  d === "" && sub.keypadBtnEmpty,
                  pressed && !!d && sub.keypadBtnPressed,
                ]}
              >
                {d === "del" ? (
                  <Feather name="delete" size={20} color="#666" />
                ) : (
                  <Text style={sub.keypadBtnText}>{d}</Text>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      <Pressable
        style={[sub.primaryBtn, pin.length < 4 && sub.primaryBtnDisabled]}
        disabled={pin.length < 4}
        onPress={handleConnect}
      >
        <Text style={sub.primaryBtnText}>Conectar</Text>
      </Pressable>
    </View>
  );
}

// ─── QRCODE ─────────────────────────────────────────────────────────────────

function QrcodeContent({ onShowDialog }: { onShowDialog: (d: DialogState) => void }) {
  const scanLine = useSharedValue(0);

  useEffect(() => {
    const loop = () => {
      scanLine.value = withTiming(1, { duration: 2200 }, () => {
        scanLine.value = 0;
        loop();
      });
    };
    loop();
  }, []);

  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${interpolate(scanLine.value, [0, 1], [8, 82], Extrapolation.CLAMP)}%`,
  }));

  return (
    <View>
      <Text style={sub.title}>Escanear QR Code</Text>
      <Text style={sub.desc}>Aponte a câmera para o QR Code do prestador</Text>

      <View style={sub.viewfinder}>
        {[
          { top: 16, left: 16, borderTopWidth: 3, borderLeftWidth: 3 },
          { top: 16, right: 16, borderTopWidth: 3, borderRightWidth: 3 },
          { bottom: 16, left: 16, borderBottomWidth: 3, borderLeftWidth: 3 },
          { bottom: 16, right: 16, borderBottomWidth: 3, borderRightWidth: 3 },
        ].map((s, i) => (
          <View key={i} style={[sub.corner, { borderColor: Colors.accent }, s]} />
        ))}
        <Animated.View style={[sub.scanLine, scanLineStyle]} />
        <Text style={sub.viewfinderLabel}>câmera indisponível em preview</Text>
      </View>

      <Pressable
        style={sub.ghostBtn}
        onPress={() =>
          onShowDialog({ title: "Dica", message: "Use o PINCODE para conectar manualmente." })
        }
      >
        <Text style={sub.ghostBtnText}>Inserir código manualmente</Text>
      </Pressable>
    </View>
  );
}

// ─── NFC ────────────────────────────────────────────────────────────────────

function NfcContent() {
  const p1 = useSharedValue(0);
  const p2 = useSharedValue(0);
  const p3 = useSharedValue(0);

  useEffect(() => {
    const pulse = (val: typeof p1, delay: number) => {
      const loop = () => {
        val.value = withTiming(0, { duration: 0 }, () => {
          val.value = withTiming(1, { duration: 1800 }, () => {
            setTimeout(loop, delay);
          });
        });
      };
      setTimeout(loop, delay);
    };
    pulse(p1, 0);
    pulse(p2, 450);
    pulse(p3, 900);
  }, []);

  const mkRingStyle = (val: typeof p1, size: number) =>
    useAnimatedStyle(() => ({
      position: "absolute",
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: 1.5,
      borderColor: Colors.accent,
      transform: [{ scale: interpolate(val.value, [0, 1], [0.75, 1.55], Extrapolation.CLAMP) }],
      opacity: interpolate(val.value, [0, 0.4, 1], [0.75, 0.3, 0], Extrapolation.CLAMP),
    }));

  const ring1Style = mkRingStyle(p1, 68);
  const ring2Style = mkRingStyle(p2, 110);
  const ring3Style = mkRingStyle(p3, 160);

  return (
    <View>
      <Text style={sub.title}>Aproximação NFC</Text>
      <Text style={sub.desc}>Aproxime os dois dispositivos para iniciar o contrato</Text>

      <View style={sub.nfcWrap}>
        <Animated.View style={ring3Style} />
        <Animated.View style={ring2Style} />
        <Animated.View style={ring1Style} />
        <View style={sub.nfcIcon}>
          <Feather name="wifi" size={24} color={Colors.accent} />
        </View>
      </View>

      <View style={sub.statusRow}>
        <View style={sub.statusDot} />
        <Text style={sub.statusText}>aguardando dispositivo próximo...</Text>
      </View>
    </View>
  );
}

// ─── LINK ───────────────────────────────────────────────────────────────────

function LinkContent({ onShowDialog }: { onShowDialog: (d: DialogState) => void }) {
  const [link, setLink] = useState("");

  return (
    <View>
      <Text style={sub.title}>Inserir Link</Text>
      <Text style={sub.desc}>Cole o link de contratação recebido do prestador</Text>

      <View style={sub.linkRow}>
        <Feather name="link" size={16} color="#444" />
        <TextInput
          value={link}
          onChangeText={setLink}
          placeholder="krono.app/u/..."
          placeholderTextColor="#333"
          style={sub.linkInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {link.length > 0 && (
          <Pressable onPress={() => setLink("")}>
            <Feather name="x" size={14} color="#444" />
          </Pressable>
        )}
      </View>

      <Pressable
        style={[sub.primaryBtn, link.length === 0 && sub.primaryBtnDisabled]}
        disabled={link.length === 0}
        onPress={() =>
          onShowDialog({ title: "Em breve", message: "Conexão via link estará disponível em breve." })
        }
      >
        <Text style={sub.primaryBtnText}>Conectar</Text>
      </Pressable>
    </View>
  );
}

// ─── MAIN HIRE SHEET ────────────────────────────────────────────────────────

export function HireSheet({ open, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setPendingProvider } = useConfirmation();
  const [subMode, setSubMode] = useState<HireMethod | null>(null);
  const [disponivel, setDisponivel] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);

  const subRef = useRef<BottomSheetModal>(null);

  const snapPoints = useMemo(() => ["88%"], []);
  const subSnapPoints = useMemo(() => ["80%"], []);

  const subTitles: Record<HireMethod, string> = {
    PINCODE: "PINCODE",
    QRCODE: "QR Code",
    NFC: "Aproximação",
    LINK: "Link",
  };

  // Open / close sub sheet based on subMode
  useEffect(() => {
    if (subMode) {
      subRef.current?.present();
    } else {
      subRef.current?.dismiss();
    }
  }, [subMode]);

  const handleFoundProvider = useCallback(
    (provider: ProviderData) => {
      setPendingProvider(provider);
      subRef.current?.dismiss();
      setTimeout(() => {
        onClose();
        router.push("/contract-confirm");
      }, 300);
    },
    [setPendingProvider, onClose, router]
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.72}
        pressBehavior="close"
      />
    ),
    []
  );

  // Don't render anything when closed — avoids invisible touch-blocking overlay
  if (!open) return null;

  const hireOptions: { icon: React.ReactNode; label: string; method: HireMethod }[] = [
    {
      icon: <MaterialCommunityIcons name="qrcode-scan" size={22} color={Colors.accent} />,
      label: "QRCODE",
      method: "QRCODE",
    },
    {
      icon: <Feather name="wifi" size={22} color={Colors.accent} />,
      label: "APROXIMAÇÃO",
      method: "NFC",
    },
    {
      icon: <Feather name="hash" size={22} color={Colors.accent} />,
      label: "PINCODE",
      method: "PINCODE",
    },
    {
      icon: <Feather name="link" size={22} color={Colors.accent} />,
      label: "LINK",
      method: "LINK",
    },
  ];

  const availOptions = [
    {
      label: "Meu PINCODE",
      desc: "Informe seu código para contratação direta",
      pin: "1257",
      icon: null,
    },
    {
      label: "Gerar QRCODE",
      desc: "Mostre o QR Code para ser escaneado",
      pin: null,
      icon: <MaterialCommunityIcons name="qrcode-scan" size={24} color={Colors.accentGreen} />,
    },
    {
      label: "Compartilhar LINK",
      desc: "Copie e compartilhe o link de contratação",
      pin: null,
      icon: <Feather name="link" size={24} color={Colors.accentGreen} />,
    },
    {
      label: "Iniciar APROXIMAÇÃO",
      desc: "Ative o NFC e aproxime os dois dispositivos",
      pin: null,
      icon: <Feather name="wifi" size={24} color={Colors.accentGreen} />,
    },
  ];

  return (
    <>
      {/* ── Main Sheet ── */}
      <BottomSheet
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handle}
        onClose={onClose}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sheetTitle}>Contratação direta</Text>

          {/* AI card */}
          <Pressable
            style={styles.aiCard}
            onPress={() =>
              setDialog({
                title: "IA em breve",
                message: "A busca inteligente estará disponível em breve.",
              })
            }
          >
            <View style={styles.aiIconWrap}>
              <Feather name="zap" size={20} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.aiTitle}>Descrever o que preciso</Text>
              <Text style={styles.aiDesc}>
                A IA entende sua necessidade e encontra a pessoa certa para você
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={Colors.accent + "80"} />
          </Pressable>

          {/* Divider */}
          <View style={styles.divRow}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>OU CONTRATAR DIRETO</Text>
            <View style={styles.divLine} />
          </View>

          {/* 4-column hire grid */}
          <View style={styles.hireGrid}>
            {hireOptions.map((opt) => (
              <Pressable
                key={opt.method}
                style={({ pressed }) => [styles.hireItem, pressed && styles.hireItemPressed]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSubMode(opt.method);
                }}
              >
                {opt.icon}
                <Text style={styles.hireLabel}>{opt.label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Disponibilidade */}
          <View style={styles.availHeaderRow}>
            <Text style={styles.availTitle}>Disponibilidade</Text>
            <Pressable
              style={styles.toggleRow}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setDisponivel((d) => !d);
              }}
            >
              <Text
                style={[
                  styles.toggleLabel,
                  { color: disponivel ? Colors.accentGreen : "#444" },
                ]}
              >
                {disponivel ? "Disponível" : "Indisponível"}
              </Text>
              <View
                style={[
                  styles.toggle,
                  { backgroundColor: disponivel ? Colors.accentGreen : "#1e1e1e" },
                ]}
              >
                <View style={[styles.toggleThumb, { left: disponivel ? 21 : 3 }]} />
              </View>
            </Pressable>
          </View>

          <View style={{ opacity: disponivel ? 1 : 0.3, gap: 10, marginBottom: 8 }}>
            {availOptions.map((opt) => (
              <Pressable
                key={opt.label}
                style={({ pressed }) => [
                  styles.availRow,
                  pressed && disponivel && styles.availRowPressed,
                ]}
                onPress={() => {
                  if (!disponivel) return;
                  if (opt.pin) {
                    setDialog({
                      title: "Seu PIN",
                      message: `Informe o código  ${opt.pin}  para quem deseja te contratar.`,
                    });
                  } else {
                    setDialog({
                      title: "Em breve",
                      message: "Esta funcionalidade estará disponível em breve.",
                    });
                  }
                }}
              >
                <View style={styles.availIcon}>
                  {opt.pin ? (
                    <Text style={styles.pinDisplay}>{opt.pin}</Text>
                  ) : (
                    opt.icon
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.availLabel}>{opt.label}</Text>
                  <Text style={styles.availDesc}>{opt.desc}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </BottomSheetScrollView>
      </BottomSheet>

      {/* ── Sub Sheet (PINCODE / QR / NFC / LINK) ── */}
      <BottomSheetModal
        ref={subRef}
        snapPoints={subSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.subSheetBackground}
        handleIndicatorStyle={styles.handle}
        onDismiss={() => setSubMode(null)}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <BottomSheetScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.sheetHeaderRow}>
              <Pressable onPress={() => setSubMode(null)} style={styles.backBtn}>
                <Feather name="arrow-left" size={18} color={Colors.accent} />
              </Pressable>
              <Text style={styles.sheetHeaderLabel}>
                {subMode ? subTitles[subMode] : ""}
              </Text>
            </View>

            {subMode === "PINCODE" && (
              <PincodeContent onFoundProvider={handleFoundProvider} onShowDialog={setDialog} />
            )}
            {subMode === "QRCODE" && <QrcodeContent onShowDialog={setDialog} />}
            {subMode === "NFC" && <NfcContent />}
            {subMode === "LINK" && <LinkContent onShowDialog={setDialog} />}
          </BottomSheetScrollView>
        </KeyboardAvoidingView>
      </BottomSheetModal>

      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message}
        buttons={dialog?.buttons}
        onDismiss={() => setDialog(null)}
      />
    </>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheetBackground: {
    backgroundColor: "#0f0f0f",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: "#1e1e1e",
  },
  subSheetBackground: {
    backgroundColor: "#111",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: "#222",
  },
  handle: {
    backgroundColor: "#2a2a2a",
    width: 36,
    height: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  sheetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  backBtn: {
    padding: 4,
  },
  sheetHeaderLabel: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 16,
    color: "#fff",
  },
  sheetTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 17,
    color: "#fff",
    marginBottom: 16,
    marginTop: 4,
  },
  aiCard: {
    backgroundColor: Colors.accent + "0a",
    borderWidth: 1,
    borderColor: Colors.accent + "28",
    borderRadius: 18,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  aiIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: Colors.accent + "18",
    borderWidth: 1,
    borderColor: Colors.accent + "30",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  aiTitle: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: "#fff",
    marginBottom: 4,
  },
  aiDesc: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#555",
    lineHeight: 16,
  },
  divRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  divLine: { flex: 1, height: 1, backgroundColor: "#1a1a1a" },
  divText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#2e2e2e",
    letterSpacing: 1,
  },
  hireGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  hireItem: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: "center",
    gap: 10,
  },
  hireItemPressed: {
    backgroundColor: Colors.accent + "10",
    borderColor: Colors.accent + "40",
  },
  hireLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 8,
    color: "#555",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
  availHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  availTitle: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    letterSpacing: 0.3,
  },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: 12,
    position: "relative",
  },
  toggleThumb: {
    position: "absolute",
    top: 5,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#000",
  },
  availRow: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  availRowPressed: {
    backgroundColor: Colors.accentGreen + "08",
    borderColor: Colors.accentGreen + "22",
  },
  availIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#161616",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pinDisplay: {
    fontFamily: "DMMono_500Medium",
    fontSize: 15,
    color: Colors.accent,
    fontWeight: "800",
    letterSpacing: 2,
  },
  availLabel: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
    marginBottom: 3,
  },
  availDesc: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    lineHeight: 15,
  },
});

// ─── SUB STYLES ─────────────────────────────────────────────────────────────

const sub = StyleSheet.create({
  title: {
    fontFamily: "Sora_700Bold",
    fontSize: 18,
    color: "#fff",
    marginBottom: 6,
  },
  desc: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#555",
    marginBottom: 28,
    lineHeight: 18,
  },
  userCard: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 16,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accentGreen + "20",
    borderWidth: 2,
    borderColor: Colors.accentGreen + "40",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  userAvatarText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 20,
    color: Colors.accentGreen,
    fontWeight: "700",
  },
  userName: {
    fontFamily: "Sora_700Bold",
    fontSize: 17,
    color: "#fff",
    marginBottom: 4,
  },
  infoChipsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  infoChipText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#555",
  },
  confirmDesc: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#444",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  primaryBtnDisabled: {
    opacity: 0.35,
  },
  primaryBtnText: {
    fontFamily: "Sora_700Bold",
    fontSize: 15,
    color: "#fff",
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
  },
  ghostBtnText: {
    fontFamily: "Sora_400Regular",
    fontSize: 13,
    color: "#555",
  },
  pinRow: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginBottom: 28,
  },
  pinDigit: {
    width: 40,
    height: 48,
    borderRadius: 10,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    alignItems: "center",
    justifyContent: "center",
  },
  pinDigitFilled: {
    borderColor: Colors.accent + "60",
    backgroundColor: Colors.accent + "10",
  },
  pinDigitText: {
    color: Colors.accent,
    fontSize: 20,
    fontFamily: "DMMono_500Medium",
  },
  keypadGrid: {
    gap: 10,
    marginBottom: 24,
  },
  keypadRow: {
    flexDirection: "row",
    gap: 10,
  },
  keypadBtn: {
    flex: 1,
    height: 54,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  keypadBtnEmpty: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  keypadBtnPressed: {
    backgroundColor: Colors.accent + "15",
    borderColor: Colors.accent + "30",
  },
  keypadBtnText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 20,
    color: "#fff",
  },
  viewfinder: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderColor: Colors.accent,
  },
  scanLine: {
    position: "absolute",
    left: "10%",
    right: "10%",
    height: 2,
    backgroundColor: Colors.accent + "80",
    borderRadius: 1,
  },
  viewfinderLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#333",
    textAlign: "center",
  },
  nfcWrap: {
    width: 180,
    height: 180,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    position: "relative",
  },
  nfcIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.accent + "15",
    borderWidth: 1,
    borderColor: Colors.accent + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "center",
    marginBottom: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  statusText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#444",
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 20,
  },
  linkInput: {
    flex: 1,
    fontFamily: "DMMono_400Regular",
    fontSize: 13,
    color: "#fff",
  },
});
