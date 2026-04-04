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
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppDialog, AppDialogButton } from "@/components/AppDialog";
import { PincodeSheet } from "@/components/PincodeSheet";
import { ColorPalette, useTheme } from "@/context/ThemeContext";
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
  colors,
}: {
  onFoundProvider: (p: ProviderData) => void;
  onShowDialog: (d: DialogState) => void;
  colors: ColorPalette;
}) {
  const [pin, setPin] = useState("");
  const [found, setFound] = useState<ProviderData | null>(null);
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
        <Text style={styles.title}>Prestador encontrado</Text>
        <View style={styles.userCard}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>{found.initials}</Text>
          </View>
          <Text style={styles.userName}>{found.name}</Text>
          <View style={styles.infoChipsRow}>
            <View style={styles.infoChip}>
              <Feather name="briefcase" size={10} color={colors.textSecondary} />
              <Text style={styles.infoChipText}>{found.totalContracts ?? 0} contratos</Text>
            </View>
            <View style={styles.infoChip}>
              <Feather name="tool" size={10} color={colors.textSecondary} />
              <Text style={styles.infoChipText}>{found.services.length} {found.services.length === 1 ? "service" : "services"}</Text>
            </View>
            <View style={styles.infoChip}>
              <Feather name="map-pin" size={10} color={colors.textSecondary} />
              <Text style={styles.infoChipText}>{found.distancia} km</Text>
            </View>
          </View>
        </View>
        <Text style={styles.confirmDesc}>
          Confirme o prestador para definir os detalhes do contrato.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={handleContinue}>
          <Feather name="arrow-right" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Configurar contrato</Text>
        </Pressable>
        <Pressable style={styles.ghostBtn} onPress={() => setFound(null)}>
          <Text style={styles.ghostBtnText}>Voltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.title}>Inserir PINCODE</Text>
      <Text style={styles.desc}>Digite o código do prestador para iniciar o contrato</Text>

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

function QrcodeContent({
  onShowDialog,
  colors,
}: {
  onShowDialog: (d: DialogState) => void;
  colors: ColorPalette;
}) {
  const styles = useMemo(() => createSubStyles(colors), [colors]);
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
      <Text style={styles.title}>Escanear QR Code</Text>
      <Text style={styles.desc}>Aponte a câmera para o QR Code do prestador</Text>

      <View style={styles.viewfinder}>
        {[
          { top: 16, left: 16, borderTopWidth: 3, borderLeftWidth: 3 },
          { top: 16, right: 16, borderTopWidth: 3, borderRightWidth: 3 },
          { bottom: 16, left: 16, borderBottomWidth: 3, borderLeftWidth: 3 },
          { bottom: 16, right: 16, borderBottomWidth: 3, borderRightWidth: 3 },
        ].map((s, i) => (
          <View key={i} style={[styles.corner, { borderColor: "#ff6b35" }, s]} />
        ))}
        <Animated.View style={[styles.scanLine, scanLineStyle]} />
        <Text style={styles.viewfinderLabel}>câmera indisponível em preview</Text>
      </View>

      <Pressable
        style={styles.ghostBtn}
        onPress={() =>
          onShowDialog({ title: "Dica", message: "Use o PINCODE para conectar manualmente." })
        }
      >
        <Text style={styles.ghostBtnText}>Inserir código manualmente</Text>
      </Pressable>
    </View>
  );
}

// ─── NFC ────────────────────────────────────────────────────────────────────

function NfcContent({ colors }: { colors: ColorPalette }) {
  const styles = useMemo(() => createSubStyles(colors), [colors]);
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
      borderColor: "#ff6b35",
      transform: [{ scale: interpolate(val.value, [0, 1], [0.75, 1.55], Extrapolation.CLAMP) }],
      opacity: interpolate(val.value, [0, 0.4, 1], [0.75, 0.3, 0], Extrapolation.CLAMP),
    }));

  const ring1Style = mkRingStyle(p1, 68);
  const ring2Style = mkRingStyle(p2, 110);
  const ring3Style = mkRingStyle(p3, 160);

  return (
    <View>
      <Text style={styles.title}>Aproximação NFC</Text>
      <Text style={styles.desc}>Aproxime os dois dispositivos para iniciar o contrato</Text>

      <View style={styles.nfcWrap}>
        <Animated.View style={ring3Style} />
        <Animated.View style={ring2Style} />
        <Animated.View style={ring1Style} />
        <View style={styles.nfcIcon}>
          <Feather name="wifi" size={24} color={"#ff6b35"} />
        </View>
      </View>

      <View style={styles.statusRow}>
        <View style={styles.statusDot} />
        <Text style={styles.statusText}>aguardando dispositivo próximo...</Text>
      </View>
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
      <Text style={styles.desc}>Cole o link de contratação recebido do prestador</Text>

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
      icon: <MaterialCommunityIcons name="qrcode-scan" size={22} color={"#ff6b35"} />,
      label: "QRCODE",
      method: "QRCODE",
    },
    {
      icon: <Feather name="wifi" size={22} color={"#ff6b35"} />,
      label: "APROXIMAÇÃO",
      method: "NFC",
    },
    {
      icon: <Feather name="hash" size={22} color={"#ff6b35"} />,
      label: "PINCODE",
      method: "PINCODE",
    },
    {
      icon: <Feather name="link" size={22} color={"#ff6b35"} />,
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
      icon: <MaterialCommunityIcons name="qrcode-scan" size={24} color={"#00e5a0"} />,
    },
    {
      label: "Compartilhar LINK",
      desc: "Copie e compartilhe o link de contratação",
      pin: null,
      icon: <Feather name="link" size={24} color={"#00e5a0"} />,
    },
    {
      label: "Iniciar APROXIMAÇÃO",
      desc: "Ative o NFC e aproxime os dois dispositivos",
      pin: null,
      icon: <Feather name="wifi" size={24} color={"#00e5a0"} />,
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
              <Text style={[styles.toggleLabel, { color: disponivel ? "#00e5a0" : colors.textMuted }]}>
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
              ? { backgroundColor: "#00e5a010", borderColor: "#00e5a030" }
              : { backgroundColor: colors.card, borderColor: colors.cardBorder },
          ]}>
            <Feather
              name={disponivel ? "check-circle" : "slash"}
              size={13}
              color={disponivel ? "#00e5a0" : colors.textMuted}
            />
            <Text style={[styles.availStatusMsg, { color: disponivel ? "#00e5a0" : colors.textMuted }]}>
              {disponivel
                ? `Sessão ativa · PINCODE ${sessionPin} gerado para esta sessão.`
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
                <Feather name="arrow-left" size={18} color={"#ff6b35"} />
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
              <QrcodeContent onShowDialog={setDialog} colors={colors} />
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
          onEndSession={endSession}
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
      flex: 1, borderWidth: 1, borderRadius: 16, paddingVertical: 18,
      alignItems: "center", gap: 10,
      backgroundColor: colors.card, borderColor: colors.cardBorder,
    },
    hireItemPressed: { backgroundColor: "#ff6b3510", borderColor: "#ff6b3540" },
    hireLabel: {
      fontFamily: "DMMono_400Regular", fontSize: 8, letterSpacing: 0.5,
      textTransform: "uppercase", textAlign: "center", color: colors.textSecondary,
    },
    availHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    availTitle: { fontFamily: "Sora_600SemiBold", fontSize: 15, color: colors.text },
    toggleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    toggleLabel: { fontFamily: "DMMono_400Regular", fontSize: 11, letterSpacing: 0.3 },
    availStatusBanner: {
      flexDirection: "row", alignItems: "center", gap: 8,
      borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
      marginBottom: 14,
    },
    availStatusMsg: { fontFamily: "DMMono_400Regular", fontSize: 11, letterSpacing: 0.2, flex: 1 },
    availRow: {
      borderWidth: 1, borderRadius: 16, padding: 14,
      flexDirection: "row", alignItems: "center", gap: 14,
      backgroundColor: colors.card, borderColor: colors.cardBorder,
    },
    availRowPressed: { backgroundColor: "#00e5a008", borderColor: "#00e5a022" },
    availIcon: {
      width: 52, height: 52, borderRadius: 14,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
      backgroundColor: colors.menuIconBg,
    },
    pinDisplay: { fontFamily: "DMMono_500Medium", fontSize: 15, color: "#ff6b35", fontWeight: "800", letterSpacing: 2 },
    availLabel: { fontFamily: "Sora_600SemiBold", fontSize: 13, marginBottom: 3, color: colors.text },
    availDesc: { fontFamily: "DMMono_400Regular", fontSize: 11, lineHeight: 15, color: colors.textMuted },
  });
}

// ─── SUB STYLES ─────────────────────────────────────────────────────────────

function createSubStyles(colors: ColorPalette) {
  return StyleSheet.create({
    title: { fontFamily: "Sora_700Bold", fontSize: 18, marginBottom: 6, color: colors.text },
    desc: { fontFamily: "DMMono_400Regular", fontSize: 12, marginBottom: 28, lineHeight: 18, color: colors.textSecondary },
    userCard: {
      borderWidth: 1, borderRadius: 20, padding: 20, alignItems: "center", marginBottom: 16,
      backgroundColor: colors.card, borderColor: colors.cardBorder,
    },
    userAvatar: {
      width: 64, height: 64, borderRadius: 32,
      backgroundColor: "#00e5a020", borderWidth: 2, borderColor: "#00e5a040",
      alignItems: "center", justifyContent: "center", marginBottom: 12,
    },
    userAvatarText: { fontFamily: "DMMono_500Medium", fontSize: 20, color: "#00e5a0", fontWeight: "700" },
    userName: { fontFamily: "Sora_700Bold", fontSize: 17, marginBottom: 4, color: colors.text },
    infoChipsRow: { flexDirection: "row", gap: 8, marginTop: 4 },
    infoChip: {
      flexDirection: "row", alignItems: "center", gap: 5,
      borderWidth: 1, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 12,
      backgroundColor: colors.surface, borderColor: colors.surfaceBorder,
    },
    infoChipText: { fontFamily: "DMMono_400Regular", fontSize: 11, color: colors.textSecondary },
    confirmDesc: {
      fontFamily: "DMMono_400Regular", fontSize: 12, textAlign: "center",
      lineHeight: 18, marginBottom: 20, color: colors.textMuted,
    },
    primaryBtn: {
      backgroundColor: "#ff6b35", borderRadius: 14, padding: 16,
      alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginBottom: 10,
    },
    primaryBtnDisabled: { opacity: 0.35 },
    primaryBtnText: { fontFamily: "Sora_700Bold", fontSize: 15, color: "#fff" },
    ghostBtn: { borderWidth: 1, borderRadius: 14, padding: 14, alignItems: "center", borderColor: colors.surfaceBorder },
    ghostBtnText: { fontFamily: "DMMono_400Regular", fontSize: 13, color: colors.textSecondary },
    pinRow: { flexDirection: "row", gap: 10, justifyContent: "center", marginBottom: 28 },
    pinDigit: {
      width: 40, height: 48, borderRadius: 10, borderWidth: 1,
      alignItems: "center", justifyContent: "center",
      backgroundColor: colors.inputBg, borderColor: colors.inputBorder,
    },
    pinDigitFilled: { borderColor: "#ff6b3560", backgroundColor: "#ff6b3510" },
    pinDigitText: { color: "#ff6b35", fontSize: 20, fontFamily: "DMMono_500Medium" },
    keypadGrid: { gap: 10, marginBottom: 24 },
    keypadRow: { flexDirection: "row", gap: 10 },
    keypadBtn: {
      flex: 1, height: 54, borderWidth: 1, borderRadius: 14,
      alignItems: "center", justifyContent: "center",
      backgroundColor: colors.inputBg, borderColor: colors.inputBorder,
    },
    keypadBtnEmpty: { backgroundColor: "transparent", borderColor: "transparent" },
    keypadBtnPressed: { backgroundColor: "#ff6b3515", borderColor: "#ff6b3530" },
    keypadBtnText: { fontFamily: "DMMono_500Medium", fontSize: 20, color: colors.text },
    viewfinder: {
      width: "100%", aspectRatio: 1, borderRadius: 20, borderWidth: 1,
      marginBottom: 20, alignItems: "center", justifyContent: "center",
      overflow: "hidden", position: "relative",
      backgroundColor: colors.card, borderColor: colors.cardBorder,
    },
    corner: { position: "absolute", width: 28, height: 28 },
    scanLine: { position: "absolute", left: "10%", right: "10%", height: 2, backgroundColor: "#ff6b3580", borderRadius: 1 },
    viewfinderLabel: { fontFamily: "DMMono_400Regular", fontSize: 11, textAlign: "center", color: colors.textDim },
    nfcWrap: {
      width: 180, height: 180, alignSelf: "center", alignItems: "center",
      justifyContent: "center", marginBottom: 24, position: "relative",
    },
    nfcIcon: {
      width: 56, height: 56, borderRadius: 28,
      backgroundColor: "#ff6b3515", borderWidth: 1, borderColor: "#ff6b3530",
      alignItems: "center", justifyContent: "center",
    },
    statusRow: { flexDirection: "row", alignItems: "center", gap: 8, justifyContent: "center", marginBottom: 20 },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#ff6b35" },
    statusText: { fontFamily: "DMMono_400Regular", fontSize: 12, color: colors.textMuted },
    linkRow: {
      flexDirection: "row", alignItems: "center", gap: 10,
      borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 20,
      backgroundColor: colors.inputBg, borderColor: colors.inputBorder,
    },
    linkInput: { flex: 1, fontFamily: "DMMono_400Regular", fontSize: 13, color: colors.text },
  });
}
