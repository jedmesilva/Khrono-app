import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
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
  ActivityIndicator,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, AppDialogButton } from "@/components/AppDialog";
import { ConnectingFeedback } from "@/components/ConnectingFeedback";
import { PincodeSheet } from "@/components/PincodeSheet";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { ColorPalette, useTheme } from "@/context/ThemeContext";
import { ProviderData, useConfirmation } from "@/context/ConfirmationContext";
import { supabase } from "@/lib/supabase";

type DialogState = { title: string; message?: string; buttons?: AppDialogButton[] } | null;

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

async function lookupProviderByPin(pin: string): Promise<ProviderData | null> {
  const { data: pinRow, error: pinErr } = await supabase
    .from("provider_pins")
    .select("profile_id")
    .eq("pin", pin)
    .eq("is_active", true)
    .single();

  if (pinErr || !pinRow) return null;

  const profileId = pinRow.profile_id as string;

  const [profileRes, provRes, servicesRes] = await Promise.all([
    supabase.from("profiles").select("id, name, first_name").eq("id", profileId).single(),
    supabase.from("provider_profiles").select("valor_base, nota, avaliacoes, total_contracts, verified").eq("profile_id", profileId).single(),
    supabase.from("provider_services").select("*").eq("profile_id", profileId).eq("is_active", true).order("sort_order"),
  ]);

  if (profileRes.error || !profileRes.data) return null;
  if (provRes.error || !provRes.data) return null;

  const profile = profileRes.data;
  const prov = provRes.data;
  const name = profile.name || profile.first_name;

  return {
    name,
    initials: getInitials(name),
    nota: parseFloat(String(prov.nota)),
    avaliacoes: prov.avaliacoes,
    distancia: 1.5,
    valorBase: parseFloat(String(prov.valor_base)),
    totalContracts: prov.total_contracts,
    verified: prov.verified,
    profileId,
    services: (servicesRes.data ?? []).map((s: any, idx: number) => ({
      id: idx + 1,
      serviceId: s.id as string,
      nome: s.nome,
      multiplicador: parseFloat(String(s.multiplicador)),
      skill: s.skill ?? "",
      tools: Array.isArray(s.tools) ? s.tools : [],
      nota: parseFloat(String(s.nota)),
      avaliacoes: s.avaliacoes,
    })),
  };
}

type HireMethod = "PINCODE" | "QRCODE" | "NFC" | "LINK";
type HireTab = "direta" | "externa";
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
  colors,
}: {
  onFoundProvider: (p: ProviderData) => void;
  onShowDialog: (d: DialogState) => void;
  colors: ColorPalette;
}) {
  const [pin, setPin] = useState("");
  const [found, setFound] = useState<ProviderData | null>(null);
  const [loading, setLoading] = useState(false);
  const styles = useMemo(() => createSubStyles(colors), [colors]);

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

  const handleConnect = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const provider = await lookupProviderByPin(pin);
      if (provider) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setFound(provider);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        onShowDialog({ title: "PIN não encontrado", message: "Verifique o código e tente novamente." });
      }
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      onShowDialog({ title: "Erro de conexão", message: "Não foi possível buscar o prestador. Tente novamente." });
    } finally {
      setLoading(false);
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
        <Text style={styles.title}>Usuário encontrado</Text>
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{found.initials}</Text>
          </View>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{found.name}</Text>
            {found.verified && <VerifiedBadge variant="full" />}
          </View>
          <View style={styles.infoChipsRow}>
            <View style={styles.infoChip}>
              <Feather name="briefcase" size={10} color={colors.textSecondary} />
              <Text style={styles.infoChipText}>{found.totalContracts ?? 0} contratos</Text>
            </View>
            <View style={styles.infoChip}>
              <Feather name="tool" size={10} color={colors.textSecondary} />
              <Text style={styles.infoChipText}>{found.services.length} {found.services.length === 1 ? "serviço" : "serviços"}</Text>
            </View>
            <View style={styles.infoChip}>
              <Feather name="map-pin" size={10} color={colors.textSecondary} />
              <Text style={styles.infoChipText}>{found.distancia} km</Text>
            </View>
          </View>
        </View>
        <Text style={styles.confirmDesc}>
          Confirme o usuário para definir os detalhes do contrato.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={handleContinue}>
          <Feather name="arrow-right" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Confirmar</Text>
        </Pressable>
        <Pressable style={styles.ghostBtn} onPress={() => setFound(null)}>
          <Text style={styles.ghostBtnText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <ConnectingFeedback
        visible
        message="Validando código..."
        subtitle="Buscando usuário pelo PINCODE"
        icon="hash"
      />
    );
  }

  return (
    <View>
      <Text style={styles.title}>Inserir PINCODE</Text>
      <Text style={styles.desc}>Digite o código do usuário para iniciar o contrato</Text>

      <View style={styles.pinRow}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View
            key={i}
            style={[styles.pinDigit, pin.length > i && styles.pinDigitFilled]}
          >
            <Text style={styles.pinDigitText}>{pin[i] ?? ""}</Text>
          </View>
        ))}
      </View>

      <View style={styles.keypadGrid}>
        {KEYPAD_ROWS.map((row, ri) => (
          <View key={ri} style={styles.keypadRow}>
            {row.map((d, ci) => (
              <Pressable
                key={ci}
                onPress={() => d && handleKey(d)}
                style={({ pressed }) => [
                  styles.keypadBtn,
                  d === "" && styles.keypadBtnEmpty,
                  pressed && !!d && styles.keypadBtnPressed,
                ]}
              >
                {d === "del" ? (
                  <Feather name="delete" size={20} color={colors.textSecondary} />
                ) : (
                  <Text style={styles.keypadBtnText}>{d}</Text>
                )}
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      <Pressable
        style={[styles.primaryBtn, pin.length < 4 && styles.primaryBtnDisabled]}
        disabled={pin.length < 4}
        onPress={handleConnect}
      >
        <Text style={styles.primaryBtnText}>Conectar</Text>
      </Pressable>
    </View>
  );
}

// ─── QRCODE ─────────────────────────────────────────────────────────────────

const CORNERS = [
  { top: 16, left: 16, borderTopWidth: 3, borderLeftWidth: 3 },
  { top: 16, right: 16, borderTopWidth: 3, borderRightWidth: 3 },
  { bottom: 16, left: 16, borderBottomWidth: 3, borderLeftWidth: 3 },
  { bottom: 16, right: 16, borderBottomWidth: 3, borderRightWidth: 3 },
];

function QrcodeContent({
  onFoundProvider,
  onShowDialog,
  colors,
}: {
  onFoundProvider: (p: ProviderData) => void;
  onShowDialog: (d: DialogState) => void;
  colors: ColorPalette;
}) {
  const styles = useMemo(() => createSubStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [validating, setValidating] = useState(false);

  const handleBarcodeScanned = useCallback(
    async ({ data }: { type: string; data: string }) => {
      if (scanned || validating) return;
      setScanned(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      try {
        const parsed = JSON.parse(data);
        if (parsed.type === "khrono-qr" && parsed.provider) {
          onFoundProvider(parsed.provider as ProviderData);
          return;
        }
      } catch {
        // not JSON — ignore
      }

      if (/^\d{4,6}$/.test(data.trim())) {
        setValidating(true);
        try {
          const provider = await lookupProviderByPin(data.trim());
          if (provider) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onFoundProvider(provider);
          } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            onShowDialog({
              title: "PIN não encontrado",
              message: "O QR Code contém um PIN que não foi encontrado.",
            });
            setTimeout(() => setScanned(false), 500);
          }
        } catch {
          onShowDialog({
            title: "Erro de conexão",
            message: "Não foi possível identificar o usuário. Tente novamente.",
          });
          setTimeout(() => setScanned(false), 500);
        } finally {
          setValidating(false);
        }
      } else {
        onShowDialog({
          title: "QR Code inválido",
          message: "Este QR Code não é reconhecido pelo Khrono.",
        });
        setTimeout(() => setScanned(false), 3000);
      }
    },
    [scanned, validating, onFoundProvider, onShowDialog]
  );

  if (validating) {
    return (
      <ConnectingFeedback
        visible
        message="Identificando usuário..."
        subtitle="Verificando o código do QR Code"
        icon="maximize"
      />
    );
  }

  // Still loading permissions
  if (!permission) {
    return (
      <View>
        <Text style={styles.title}>Escanear QR Code</Text>
        <View style={[styles.viewfinder, { justifyContent: "center" }]}>
          <ActivityIndicator color="#e06030" size="large" />
        </View>
      </View>
    );
  }

  // Permission denied or not yet requested
  if (!permission.granted) {
    return (
      <View>
        <Text style={styles.title}>Escanear QR Code</Text>
        <Text style={styles.desc}>
          A câmera precisa de permissão para escanear QR Codes de usuários.
        </Text>
        <View style={[styles.viewfinder, { justifyContent: "center", gap: 16 }]}>
          <Feather name="camera-off" size={40} color={colors.textMuted} />
          <Text style={styles.viewfinderLabel}>câmera sem permissão</Text>
        </View>
        <Pressable
          style={[styles.primaryBtn, { marginTop: 4 }]}
          onPress={requestPermission}
        >
          <Feather name="camera" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Permitir câmera</Text>
        </Pressable>
      </View>
    );
  }

  // Camera ready
  return (
    <View>
      <Text style={styles.title}>Escanear QR Code</Text>
      <Text style={styles.desc}>Aponte a câmera para o QR Code do usuário</Text>

      <View style={styles.viewfinder}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
        />
        {CORNERS.map((s, i) => (
          <View key={i} style={[styles.corner, { borderColor: "#e06030" }, s]} />
        ))}
        {scanned && (
          <View style={styles.scannedOverlay}>
            <Feather name="check-circle" size={52} color="#e06030" />
          </View>
        )}
      </View>

      {scanned && (
        <Pressable style={styles.ghostBtn} onPress={() => setScanned(false)}>
          <Text style={styles.ghostBtnText}>Escanear novamente</Text>
        </Pressable>
      )}
    </View>
  );
}

// ─── NFC ────────────────────────────────────────────────────────────────────

function NfcContent({ colors }: { colors: ColorPalette }) {
  const styles = useMemo(() => createSubStyles(colors), [colors]);

  return (
    <View>
      <Text style={styles.title}>Aproximação NFC</Text>
      <Text style={styles.desc}>Aproxime os dois dispositivos para iniciar o contrato</Text>
      <ConnectingFeedback
        visible
        message="Conectando via NFC..."
        subtitle="Mantenha os dispositivos próximos"
        icon="wifi"
      />
    </View>
  );
}

// ─── LINK ───────────────────────────────────────────────────────────────────

function LinkContent({
  onShowDialog,
  colors,
}: {
  onShowDialog: (d: DialogState) => void;
  colors: ColorPalette;
}) {
  const styles = useMemo(() => createSubStyles(colors), [colors]);
  const [link, setLink] = useState("");

  return (
    <View>
      <Text style={styles.title}>Inserir Link</Text>
      <Text style={styles.desc}>Cole o link de contratação recebido do usuário</Text>

      <View style={styles.linkRow}>
        <Feather name="link" size={16} color={colors.textMuted} />
        <BottomSheetTextInput
          value={link}
          onChangeText={setLink}
          placeholder="krono.app/u/..."
          placeholderTextColor={colors.textDim}
          style={styles.linkInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
        />
        {link.length > 0 && (
          <Pressable onPress={() => setLink("")}>
            <Feather name="x" size={14} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      <Pressable
        style={[styles.primaryBtn, link.length === 0 && styles.primaryBtnDisabled]}
        disabled={link.length === 0}
        onPress={() =>
          onShowDialog({ title: "Em breve", message: "Conexão via link estará disponível em breve." })
        }
      >
        <Text style={styles.primaryBtnText}>Conectar</Text>
      </Pressable>
    </View>
  );
}

// ─── ANIMATED TOGGLE ────────────────────────────────────────────────────────

function AnimatedToggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  const offset = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    offset.value = withSpring(value ? 1 : 0, { mass: 0.4, damping: 12, stiffness: 180 });
  }, [value]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(offset.value, [0, 1], [2, 20]) }],
  }));

  const trackStyle = useAnimatedStyle(() => {
    const green = [0, 229, 160];
    const off = [38, 38, 42];
    const r = Math.round(off[0] + (green[0] - off[0]) * offset.value);
    const g = Math.round(off[1] + (green[1] - off[1]) * offset.value);
    const b = Math.round(off[2] + (green[2] - off[2]) * offset.value);
    return { backgroundColor: `rgb(${r},${g},${b})` };
  });

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onValueChange(!value);
      }}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Animated.View style={[{
        width: 44, height: 26, borderRadius: 13,
        justifyContent: "center",
      }, trackStyle]}>
        <Animated.View style={[{
          width: 22, height: 22, borderRadius: 11,
          backgroundColor: "#ffffff",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.25,
          shadowRadius: 2,
          elevation: 2,
        }, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

// ─── MAIN HIRE SHEET ────────────────────────────────────────────────────────

export function HireSheet({ open, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { setPendingProvider } = useConfirmation();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState<HireTab>("direta");
  const [subMode, setSubMode] = useState<HireMethod | null>(null);
  const [disponivel, setDisponivel] = useState(false);
  const [sessionPin, setSessionPin] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [pincodeSheetOpen, setPincodeSheetOpen] = useState(false);

  const generateSessionPin = () => String(Math.floor(1000 + Math.random() * 9000));

  const startSession = () => {
    const pin = generateSessionPin();
    setSessionPin(pin);
    setDisponivel(true);
  };

  const endSession = () => {
    setDisponivel(false);
    setSessionPin(null);
    setPincodeSheetOpen(false);
  };

  const subRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    const sub = Keyboard.addListener("keyboardDidHide", () => {
      subRef.current?.snapToIndex(0);
    });
    return () => sub.remove();
  }, []);

  const snapPoints = useMemo(() => ["88%"], []);
  const subSnapPoints = useMemo(() => ["80%"], []);

  const sheetBgStyle = useMemo(
    () => ({
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderTopWidth: 1,
      borderColor: colors.sheetBorder,
    }),
    [colors]
  );

  const subSheetBgStyle = useMemo(
    () => ({
      backgroundColor: colors.surface,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      borderTopWidth: 1,
      borderColor: colors.surfaceBorder,
    }),
    [colors]
  );

  const handleStyle = useMemo(
    () => ({ backgroundColor: colors.handleColor, width: 36, height: 4 }),
    [colors]
  );

  const styles = useMemo(() => createMainStyles(colors), [colors]);

  const subTitles: Record<HireMethod, string> = {
    PINCODE: "PINCODE",
    QRCODE: "QR Code",
    NFC: "Aproximação",
    LINK: "Link",
  };

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
      endSession();
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

  if (!open) return null;

  const hireOptions: { icon: React.ReactNode; label: string; method: HireMethod }[] = [
    {
      icon: <MaterialCommunityIcons name="qrcode-scan" size={22} color={"#e06030"} />,
      label: "QRCODE",
      method: "QRCODE",
    },
    {
      icon: <Feather name="wifi" size={22} color={"#e06030"} />,
      label: "APROXIMAÇÃO",
      method: "NFC",
    },
    {
      icon: <Feather name="hash" size={22} color={"#e06030"} />,
      label: "PINCODE",
      method: "PINCODE",
    },
    {
      icon: <Feather name="link" size={22} color={"#e06030"} />,
      label: "LINK",
      method: "LINK",
    },
  ];

  const availOptions = [
    {
      label: "Meu PINCODE",
      desc: "Informe seu código para contratação direta",
      pin: sessionPin,
      icon: null,
    },
    {
      label: "Gerar QRCODE",
      desc: "Mostre o QR Code para ser escaneado",
      pin: null,
      icon: <MaterialCommunityIcons name="qrcode-scan" size={24} color={colors.textSecondary} />,
    },
    {
      label: "Compartilhar LINK",
      desc: "Copie e compartilhe o link de contratação",
      pin: null,
      icon: <Feather name="link" size={24} color={colors.textSecondary} />,
    },
    {
      label: "Iniciar APROXIMAÇÃO",
      desc: "Ative o NFC e aproxime os dois dispositivos",
      pin: null,
      icon: <Feather name="wifi" size={24} color={colors.textSecondary} />,
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
        backgroundStyle={sheetBgStyle}
        handleIndicatorStyle={handleStyle}
        onClose={onClose}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sheetTitle}>Iniciar contratação</Text>

          {/* ── Tab selector ── */}
          <View style={styles.tabBar}>
            <Pressable
              style={[styles.tabItem, activeTab === "direta" && styles.tabItemActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab("direta");
              }}
            >
              <Text style={[styles.tabLabel, activeTab === "direta" && styles.tabLabelActive]}>
                Contratação Direta
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tabItem, activeTab === "externa" && styles.tabItemActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab("externa");
              }}
            >
              <Text style={[styles.tabLabel, activeTab === "externa" && styles.tabLabelActive]}>
                Contratação Externa
              </Text>
            </Pressable>
          </View>

          {activeTab === "direta" && (
            <>
              {/* 4-column hire grid */}
              <View style={styles.hireGrid}>
                {hireOptions.map((opt) => (
                  <Pressable
                    key={opt.method}
                    style={({ pressed }) => [
                      styles.hireItem,
                      pressed && styles.hireItemPressed,
                    ]}
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
                <View style={styles.toggleRow}>
                  <Text style={[styles.toggleLabel, { color: disponivel ? "#18a06b" : colors.textMuted }]}>
                    {disponivel ? "Disponível" : "Indisponível"}
                  </Text>
                  <AnimatedToggle
                    value={disponivel}
                    onValueChange={(val) => {
                      if (!val) {
                        setDialog({
                          title: "Encerrar sessão?",
                          message: "Você ficará indisponível e o PINCODE atual será invalidado.",
                          buttons: [
                            { text: "Cancelar", style: "cancel" },
                            { text: "Encerrar", style: "destructive", onPress: endSession },
                          ],
                        });
                      } else {
                        startSession();
                      }
                    }}
                  />
                </View>
              </View>

              <View style={[
                styles.availStatusBanner,
                disponivel
                  ? { backgroundColor: "#18a06b10", borderColor: "#18a06b30" }
                  : { backgroundColor: colors.card, borderColor: colors.cardBorder },
              ]}>
                <Feather
                  name={disponivel ? "check-circle" : "slash"}
                  size={13}
                  color={disponivel ? "#18a06b" : colors.textMuted}
                />
                <Text style={[styles.availStatusMsg, { color: disponivel ? "#18a06b" : colors.textMuted }]}>
                  {disponivel
                    ? "Sessão ativa · disponível para contratações."
                    : "Você está indisponível e não pode receber contratos."}
                </Text>
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
                        Haptics.selectionAsync();
                        setPincodeSheetOpen(true);
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
                        <Feather name="hash" size={24} color={colors.textSecondary} />
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
            </>
          )}

          {activeTab === "externa" && (
            <>
              <Text style={styles.externalDesc}>
                Para contratos fora da plataforma, informe o seu papel nessa contratação.
              </Text>

              <Text style={styles.externalQuestion}>Qual é o seu papel?</Text>

              <View style={styles.roleGrid}>
                <Pressable
                  style={({ pressed }) => [styles.roleCard, pressed && styles.roleCardPressed]}
                  onPress={() => setDialog({ title: "Em breve", message: "Esta funcionalidade estará disponível em breve." })}
                >
                  <View style={styles.roleIconWrap}>
                    <Feather name="user-check" size={26} color={"#e06030"} />
                  </View>
                  <Text style={styles.roleCardTitle}>Vou ser{"\n"}contratado</Text>
                  <Text style={styles.roleCardDesc}>Receba uma solicitação de contrato</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.roleCard, pressed && styles.roleCardPressed]}
                  onPress={() => setDialog({ title: "Em breve", message: "Esta funcionalidade estará disponível em breve." })}
                >
                  <View style={styles.roleIconWrap}>
                    <Feather name="briefcase" size={26} color={"#e06030"} />
                  </View>
                  <Text style={styles.roleCardTitle}>Quero{"\n"}contratar</Text>
                  <Text style={styles.roleCardDesc}>Envie uma solicitação de contrato</Text>
                </Pressable>
              </View>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* ── Sub Sheet (PINCODE / QR / NFC / LINK) ── */}
      <BottomSheetModal
        ref={subRef}
        snapPoints={subSnapPoints}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={subSheetBgStyle}
        handleIndicatorStyle={handleStyle}
        onDismiss={() => setSubMode(null)}
        keyboardBehavior="extend"
        keyboardBlurBehavior="none"
        android_keyboardInputMode="adjustResize"
      >
          <BottomSheetScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header */}
            <View style={styles.sheetHeaderRow}>
              <Pressable onPress={() => setSubMode(null)} style={styles.backBtn}>
                <Feather name="arrow-left" size={18} color={"#e06030"} />
              </Pressable>
              <Text style={styles.sheetHeaderLabel}>
                {subMode ? subTitles[subMode] : ""}
              </Text>
            </View>

            {subMode === "PINCODE" && (
              <PincodeContent
                onFoundProvider={handleFoundProvider}
                onShowDialog={setDialog}
                colors={colors}
              />
            )}
            {subMode === "QRCODE" && (
              <QrcodeContent
                onFoundProvider={handleFoundProvider}
                onShowDialog={setDialog}
                colors={colors}
              />
            )}
            {subMode === "NFC" && <NfcContent colors={colors} />}
            {subMode === "LINK" && (
              <LinkContent onShowDialog={setDialog} colors={colors} />
            )}
          </BottomSheetScrollView>
      </BottomSheetModal>

      <AppDialog
        visible={!!dialog}
        title={dialog?.title ?? ""}
        message={dialog?.message}
        buttons={dialog?.buttons}
        onDismiss={() => setDialog(null)}
      />

      {sessionPin && (
        <PincodeSheet
          visible={pincodeSheetOpen}
          pinCode={sessionPin}
          onClose={() => setPincodeSheetOpen(false)}
        />
      )}
    </>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────────────

function createMainStyles(colors: ColorPalette) {
  return StyleSheet.create({
    scrollContent: { paddingHorizontal: 20, paddingTop: 4 },
    sheetHeaderRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
    backBtn: { padding: 4 },
    sheetHeaderLabel: { fontFamily: "Sora_600SemiBold", fontSize: 16, color: colors.text },
    sheetTitle: { fontFamily: "Sora_700Bold", fontSize: 17, marginBottom: 16, marginTop: 4, color: colors.text },
    hireGrid: { flexDirection: "row", gap: 10, marginBottom: 28 },
    hireItem: {
      flex: 1, borderWidth: 1, borderRadius: 24, paddingVertical: 18,
      alignItems: "center", gap: 10,
      backgroundColor: colors.card, borderColor: colors.cardBorder,
    },
    hireItemPressed: { backgroundColor: "#e0603010", borderColor: "#e0603040" },
    hireLabel: {
      fontFamily: "DMSans_400Regular", fontSize: 8, letterSpacing: 0.5,
      textTransform: "uppercase", textAlign: "center", color: colors.textSecondary,
    },
    availHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    availTitle: { fontFamily: "Sora_600SemiBold", fontSize: 15, color: colors.text },
    toggleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    toggleLabel: { fontFamily: "DMSans_400Regular", fontSize: 11, letterSpacing: 0.3 },
    availStatusBanner: {
      flexDirection: "row", alignItems: "center", gap: 8,
      borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
      marginBottom: 14,
    },
    availStatusMsg: { fontFamily: "DMSans_400Regular", fontSize: 11, letterSpacing: 0.2, flex: 1 },
    availRow: {
      borderWidth: 1, borderRadius: 24, padding: 14,
      flexDirection: "row", alignItems: "center", gap: 14,
      backgroundColor: colors.card, borderColor: colors.cardBorder,
    },
    availRowPressed: { backgroundColor: "#e0603008", borderColor: "#e0603022" },
    availIcon: {
      width: 52, height: 52, borderRadius: 14,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
      backgroundColor: colors.menuIconBg,
    },
    availLabel: { fontFamily: "Sora_600SemiBold", fontSize: 13, marginBottom: 3, color: colors.text },
    availDesc: { fontFamily: "DMSans_400Regular", fontSize: 11, lineHeight: 15, color: colors.textMuted },
    tabBar: {
      flexDirection: "row", gap: 8, marginBottom: 24,
      backgroundColor: colors.card, borderRadius: 16,
      borderWidth: 1, borderColor: colors.cardBorder, padding: 4,
    },
    tabItem: {
      flex: 1, paddingVertical: 10, borderRadius: 12,
      alignItems: "center", justifyContent: "center",
    },
    tabItemActive: {
      backgroundColor: "#e06030",
    },
    tabLabel: {
      fontFamily: "DMSans_500Medium", fontSize: 12,
      color: colors.textSecondary, textAlign: "center",
    },
    tabLabelActive: {
      color: "#fff",
      fontFamily: "Sora_600SemiBold",
    },
    externalDesc: {
      fontFamily: "DMSans_400Regular", fontSize: 13, lineHeight: 19,
      color: colors.textSecondary, marginBottom: 24,
    },
    externalQuestion: {
      fontFamily: "Sora_700Bold", fontSize: 16, color: colors.text, marginBottom: 16,
    },
    roleGrid: {
      flexDirection: "row", gap: 12, marginBottom: 8,
    },
    roleCard: {
      flex: 1, borderWidth: 1, borderRadius: 24,
      paddingVertical: 24, paddingHorizontal: 16,
      alignItems: "center", gap: 12,
      backgroundColor: colors.card, borderColor: colors.cardBorder,
    },
    roleCardPressed: { backgroundColor: "#e0603010", borderColor: "#e0603040" },
    roleIconWrap: {
      width: 60, height: 60, borderRadius: 18,
      alignItems: "center", justifyContent: "center",
      backgroundColor: "#e0603012", borderWidth: 1, borderColor: "#e0603030",
    },
    roleCardTitle: {
      fontFamily: "Sora_700Bold", fontSize: 15, color: colors.text,
      textAlign: "center", lineHeight: 21,
    },
    roleCardDesc: {
      fontFamily: "DMSans_400Regular", fontSize: 11, lineHeight: 15,
      color: colors.textMuted, textAlign: "center",
    },
  });
}

// ─── SUB STYLES ─────────────────────────────────────────────────────────────

function createSubStyles(colors: ColorPalette) {
  return StyleSheet.create({
    title: { fontFamily: "Sora_700Bold", fontSize: 18, marginBottom: 6, color: colors.text },
    desc: { fontFamily: "DMSans_400Regular", fontSize: 12, marginBottom: 28, lineHeight: 18, color: colors.textSecondary },
    userCard: {
      borderWidth: 1, borderRadius: 20, padding: 20, alignItems: "center", marginBottom: 16,
      backgroundColor: colors.card, borderColor: colors.cardBorder,
    },
    userAvatar: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: "#e0603012", borderWidth: 2, borderColor: "#e0603030",
      alignItems: "center", justifyContent: "center", marginBottom: 12,
    },
    userNameRow: {
      flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4,
    },
    userName: { fontFamily: "Sora_700Bold", fontSize: 17, color: colors.text },
    infoChipsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
    infoChip: {
      flexDirection: "row", alignItems: "center", gap: 5,
      borderWidth: 1, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12,
      backgroundColor: colors.surface, borderColor: colors.surfaceBorder,
    },
    infoChipText: { fontFamily: "DMSans_400Regular", fontSize: 11, color: colors.textSecondary },
    confirmDesc: {
      fontFamily: "DMSans_400Regular", fontSize: 12, textAlign: "center",
      lineHeight: 18, marginBottom: 20, color: colors.textMuted,
    },
    primaryBtn: {
      backgroundColor: "#e06030", borderRadius: 14, padding: 16,
      alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginBottom: 10,
    },
    primaryBtnDisabled: { opacity: 0.35 },
    primaryBtnText: { fontFamily: "Sora_700Bold", fontSize: 15, color: "#fff" },
    ghostBtn: { borderWidth: 1, borderRadius: 14, padding: 14, alignItems: "center", borderColor: colors.surfaceBorder },
    ghostBtnText: { fontFamily: "DMSans_400Regular", fontSize: 13, color: colors.textSecondary },
    pinRow: { flexDirection: "row", gap: 10, justifyContent: "center", marginBottom: 28 },
    pinDigit: {
      width: 40, height: 48, borderRadius: 10, borderWidth: 1,
      alignItems: "center", justifyContent: "center",
      backgroundColor: colors.inputBg, borderColor: colors.inputBorder,
    },
    pinDigitFilled: { borderColor: "#e0603060", backgroundColor: "#e0603010" },
    pinDigitText: { color: "#e06030", fontSize: 20, fontFamily: "DMSans_500Medium" },
    keypadGrid: { gap: 10, marginBottom: 24 },
    keypadRow: { flexDirection: "row", gap: 10 },
    keypadBtn: {
      flex: 1, height: 54, borderWidth: 1, borderRadius: 14,
      alignItems: "center", justifyContent: "center",
      backgroundColor: colors.inputBg, borderColor: colors.inputBorder,
    },
    keypadBtnEmpty: { backgroundColor: "transparent", borderColor: "transparent" },
    keypadBtnPressed: { backgroundColor: "#e0603015", borderColor: "#e0603030" },
    keypadBtnText: { fontFamily: "DMSans_500Medium", fontSize: 20, color: colors.text },
    viewfinder: {
      width: "100%", aspectRatio: 1, borderRadius: 20, borderWidth: 1,
      marginBottom: 20, alignItems: "center", justifyContent: "center",
      overflow: "hidden", position: "relative",
      backgroundColor: colors.card, borderColor: colors.cardBorder,
    },
    corner: { position: "absolute", width: 28, height: 28 },
    scanLine: { position: "absolute", left: "10%", right: "10%", height: 2, backgroundColor: "#e0603080", borderRadius: 1 },
    scannedOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "#00000080",
      alignItems: "center",
      justifyContent: "center",
    },
    viewfinderLabel: { fontFamily: "DMSans_400Regular", fontSize: 11, textAlign: "center", color: colors.textDim },
    nfcWrap: {
      width: 180, height: 180, alignSelf: "center", alignItems: "center",
      justifyContent: "center", marginBottom: 24, position: "relative",
    },
    nfcIcon: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: "#e0603015", borderWidth: 1, borderColor: "#e0603030",
      alignItems: "center", justifyContent: "center",
    },
    statusRow: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 20 },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#e06030" },
    statusText: { fontFamily: "DMSans_400Regular", fontSize: 12, color: colors.textMuted },
    linkRow: {
      flexDirection: "row", alignItems: "center", gap: 10,
      borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 20,
      backgroundColor: colors.inputBg, borderColor: colors.inputBorder,
    },
    linkInput: { flex: 1, fontFamily: "DMSans_400Regular", fontSize: 13, color: colors.text },
  });
}
