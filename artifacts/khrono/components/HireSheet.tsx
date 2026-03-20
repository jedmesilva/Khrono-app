import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";
import { useContracts } from "@/context/ContractsContext";

const MOCK_USERS: Record<string, { name: string; initials: string; skill: string; ratePerHour: number }> = {
  "1234": { name: "Carlos Mendes", initials: "CM", skill: "Pintor Residencial", ratePerHour: 45 },
  "5678": { name: "Juliana Rocha", initials: "JR", skill: "Personal Trainer", ratePerHour: 80 },
  "9012": { name: "Pedro Alves", initials: "PA", skill: "Eletricista", ratePerHour: 60 },
  "4321": { name: "Isabela Martins", initials: "IM", skill: "Cuidadora de Idosos", ratePerHour: 40 },
  "1257": { name: "Jedme Silva", initials: "JS", skill: "Montador de Móveis", ratePerHour: 50 },
};

type HireMethod = "PINCODE" | "QRCODE" | "NFC" | "LINK";
type Props = { open: boolean; onClose: () => void };

const KEYPAD = ["1","2","3","4","5","6","7","8","9","","0","del"];

// ─── PINCODE ────────────────────────────────────────────────────────────────

function PincodeContent({ onSuccess }: { onSuccess: () => void }) {
  const { startContract } = useContracts();
  const [pin, setPin] = useState("");
  const [found, setFound] = useState<typeof MOCK_USERS[string] | null>(null);

  const handleKey = (d: string) => {
    if (d === "del") { setPin(p => p.slice(0, -1)); return; }
    if (pin.length < 6) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setPin(p => p + d);
    }
  };

  const handleConnect = () => {
    const user = MOCK_USERS[pin];
    if (user) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFound(user);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("PIN não encontrado", "Verifique o código e tente novamente.");
    }
  };

  const handleConfirm = () => {
    if (!found) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startContract({
      role: "hiring",
      person: { name: found.name, initials: found.initials, skill: found.skill },
      ratePerHour: found.ratePerHour,
    });
    onSuccess();
  };

  if (found) {
    return (
      <View>
        <Text style={sub.title}>Confirmar contrato</Text>
        <View style={sub.userCard}>
          <View style={sub.userAvatar}>
            <Text style={sub.userAvatarText}>{found.initials}</Text>
          </View>
          <Text style={sub.userName}>{found.name}</Text>
          <Text style={sub.userSkill}>{found.skill}</Text>
          <View style={sub.rateBadge}>
            <Text style={sub.rateText}>R${found.ratePerHour}/h</Text>
          </View>
        </View>
        <Text style={sub.confirmDesc}>
          Ao confirmar, o cronômetro inicia imediatamente e o valor é calculado por tempo corrido.
        </Text>
        <Pressable style={sub.primaryBtn} onPress={handleConfirm}>
          <Feather name="zap" size={16} color="#fff" />
          <Text style={sub.primaryBtnText}>Iniciar contrato</Text>
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
        {[0,1,2,3,4,5].map(i => (
          <View key={i} style={[sub.pinDigit, pin.length > i && sub.pinDigitFilled]}>
            <Text style={sub.pinDigitText}>{pin[i] ? "•" : ""}</Text>
          </View>
        ))}
      </View>

      <View style={sub.keypadGrid}>
        {KEYPAD.map((d, i) => (
          <Pressable
            key={i}
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

function QrcodeContent() {
  const scanLine = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLine, { toValue: 1, duration: 2200, useNativeDriver: false }),
        Animated.timing(scanLine, { toValue: 0, duration: 0, useNativeDriver: false }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const scanTop = scanLine.interpolate({ inputRange: [0, 1], outputRange: ["8%", "82%"] });

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
        <Animated.View style={[sub.scanLine, { top: scanTop }]} />
        <Text style={sub.viewfinderLabel}>câmera indisponível em preview</Text>
      </View>

      <Pressable style={sub.ghostBtn} onPress={() => Alert.alert("Dica", "Use o PINCODE para conectar manualmente.")}>
        <Text style={sub.ghostBtnText}>Inserir código manualmente</Text>
      </Pressable>
    </View>
  );
}

// ─── NFC ────────────────────────────────────────────────────────────────────

function NfcContent() {
  const p1 = useRef(new Animated.Value(0)).current;
  const p2 = useRef(new Animated.Value(0)).current;
  const p3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = (val: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue: 1, duration: 1800, useNativeDriver: true }),
          Animated.timing(val, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    const a1 = pulse(p1, 0);
    const a2 = pulse(p2, 450);
    const a3 = pulse(p3, 900);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  const mkRing = (val: Animated.Value, size: number) => ({
    position: "absolute" as const,
    width: size, height: size, borderRadius: size / 2,
    borderWidth: 1.5, borderColor: Colors.accent,
    transform: [{ scale: val.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.55] }) }],
    opacity: val.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.75, 0.3, 0] }),
  });

  return (
    <View>
      <Text style={sub.title}>Aproximação NFC</Text>
      <Text style={sub.desc}>Aproxime os dois dispositivos para iniciar o contrato</Text>

      <View style={sub.nfcWrap}>
        <Animated.View style={mkRing(p3, 160)} />
        <Animated.View style={mkRing(p2, 110)} />
        <Animated.View style={mkRing(p1, 68)} />
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

function LinkContent() {
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
        onPress={() => Alert.alert("Em breve", "Conexão via link estará disponível em breve.")}
      >
        <Text style={sub.primaryBtnText}>Conectar</Text>
      </Pressable>
    </View>
  );
}

// ─── SUB SHEET ──────────────────────────────────────────────────────────────

function SubSheet({ tipo, onClose, onSuccess }: { tipo: HireMethod; onClose: () => void; onSuccess: () => void }) {
  const insets = useSafeAreaInsets();
  const isIOS = Platform.OS === "ios";

  const titles: Record<HireMethod, string> = {
    PINCODE: "PINCODE",
    QRCODE: "QR Code",
    NFC: "Aproximação",
    LINK: "Link",
  };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalWrap}
        behavior={isIOS ? "padding" : undefined}
        pointerEvents="box-none"
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.handle} />
          <View style={styles.sheetHeaderRow}>
            <Pressable onPress={onClose} style={styles.backBtn}>
              <Feather name="arrow-left" size={18} color={Colors.accent} />
            </Pressable>
            <Text style={styles.sheetHeaderLabel}>{titles[tipo]}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {tipo === "PINCODE" && <PincodeContent onSuccess={onSuccess} />}
            {tipo === "QRCODE"  && <QrcodeContent />}
            {tipo === "NFC"     && <NfcContent />}
            {tipo === "LINK"    && <LinkContent />}
            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── MAIN HIRE SHEET ────────────────────────────────────────────────────────

export function HireSheet({ open, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [subMode, setSubMode] = useState<HireMethod | null>(null);
  const [disponivel, setDisponivel] = useState(false);

  const handleClose = () => {
    setSubMode(null);
    onClose();
  };

  const hireOptions: { icon: React.ReactNode; label: string; method: HireMethod }[] = [
    { icon: <MaterialCommunityIcons name="qrcode-scan" size={22} color={Colors.accent} />, label: "QRCODE",     method: "QRCODE"  },
    { icon: <Feather name="wifi"                        size={22} color={Colors.accent} />, label: "APROXIMAÇÃO",method: "NFC"     },
    { icon: <Feather name="hash"                        size={22} color={Colors.accent} />, label: "PINCODE",   method: "PINCODE" },
    { icon: <Feather name="link"                        size={22} color={Colors.accent} />, label: "LINK",      method: "LINK"    },
  ];

  const availOptions = [
    { label: "Meu PINCODE",        desc: "Informe seu código para contratação direta",              pin: "1257", icon: null },
    { label: "Gerar QRCODE",       desc: "Mostre o QR Code para ser escaneado",                     pin: null,   icon: <MaterialCommunityIcons name="qrcode-scan" size={24} color={Colors.accentGreen} /> },
    { label: "Compartilhar LINK",  desc: "Copie e compartilhe o link de contratação",               pin: null,   icon: <Feather name="link" size={24} color={Colors.accentGreen} /> },
    { label: "Iniciar APROXIMAÇÃO",desc: "Ative o NFC e aproxime os dois dispositivos",             pin: null,   icon: <Feather name="wifi" size={24} color={Colors.accentGreen} /> },
  ];

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalWrap}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={handleClose} />

        <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />

          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.sheetTitle}>Contratação direta</Text>

            {/* AI card */}
            <Pressable
              style={styles.aiCard}
              onPress={() => Alert.alert("IA em breve", "A busca inteligente estará disponível em breve.")}
            >
              <View style={styles.aiIconWrap}>
                <Feather name="zap" size={20} color={Colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.aiTitle}>Descrever o que preciso</Text>
                <Text style={styles.aiDesc}>A IA entende sua necessidade e encontra a pessoa certa para você</Text>
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
                  setDisponivel(d => !d);
                }}
              >
                <Text style={[styles.toggleLabel, { color: disponivel ? Colors.accentGreen : "#444" }]}>
                  {disponivel ? "Disponível" : "Indisponível"}
                </Text>
                <View style={[styles.toggle, { backgroundColor: disponivel ? Colors.accentGreen : "#1e1e1e" }]}>
                  <View style={[styles.toggleThumb, { left: disponivel ? 21 : 3 }]} />
                </View>
              </Pressable>
            </View>

            <View style={{ opacity: disponivel ? 1 : 0.3, gap: 10, marginBottom: 8 }}>
              {availOptions.map((opt) => (
                <Pressable
                  key={opt.label}
                  style={({ pressed }) => [styles.availRow, pressed && disponivel && styles.availRowPressed]}
                  onPress={() => {
                    if (!disponivel) return;
                    if (opt.pin) {
                      Alert.alert("Seu PIN", `Informe o código  ${opt.pin}  para quem deseja te contratar.`);
                    } else {
                      Alert.alert("Em breve", "Esta funcionalidade estará disponível em breve.");
                    }
                  }}
                >
                  <View style={styles.availIcon}>
                    {opt.pin
                      ? <Text style={styles.pinDisplay}>{opt.pin}</Text>
                      : opt.icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.availLabel}>{opt.label}</Text>
                    <Text style={styles.availDesc}>{opt.desc}</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <View style={{ height: 8 }} />
          </ScrollView>
        </View>
      </View>

      {subMode && (
        <SubSheet
          tipo={subMode}
          onClose={() => setSubMode(null)}
          onSuccess={handleClose}
        />
      )}
    </Modal>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  modalWrap: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.75)",
  },
  sheet: {
    backgroundColor: "#0f0f0f",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderColor: "#1e1e1e",
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: "90%",
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: "#2a2a2a",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
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
    fontSize: 10,
    color: "#555",
    lineHeight: 14,
  },
});

const sub = StyleSheet.create({
  title: {
    fontFamily: "Sora_700Bold",
    fontSize: 17,
    color: "#fff",
    marginBottom: 8,
  },
  desc: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#555",
    lineHeight: 17,
    marginBottom: 28,
  },

  // Pincode
  pinRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 32,
  },
  pinDigit: {
    width: 36,
    height: 48,
    borderBottomWidth: 2,
    borderBottomColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
  },
  pinDigitFilled: {
    borderBottomColor: Colors.accent,
  },
  pinDigitText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 24,
    color: "#fff",
  },
  keypadGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
    justifyContent: "space-between",
    rowGap: 10,
  },
  keypadBtn: {
    width: "31%",
    aspectRatio: 1.7,
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
    backgroundColor: Colors.accent + "18",
    borderColor: Colors.accent + "40",
  },
  keypadBtnText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 22,
    color: "#fff",
  },

  // Confirm
  userCard: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.accent + "18",
    borderWidth: 2,
    borderColor: Colors.accent + "40",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  userAvatarText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 18,
    color: Colors.accent,
  },
  userName: {
    fontFamily: "Sora_700Bold",
    fontSize: 18,
    color: "#fff",
  },
  userSkill: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#555",
  },
  rateBadge: {
    backgroundColor: Colors.accent + "12",
    borderWidth: 1,
    borderColor: Colors.accent + "28",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 8,
  },
  rateText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 15,
    color: Colors.accent,
  },
  confirmDesc: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#444",
    lineHeight: 17,
    textAlign: "center",
    marginBottom: 20,
  },

  // QR viewfinder
  viewfinder: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: "#090909",
    borderRadius: 20,
    marginBottom: 16,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 28,
    height: 28,
    borderRadius: 2,
  },
  scanLine: {
    position: "absolute",
    left: "8%",
    right: "8%",
    height: 2,
    backgroundColor: Colors.accent,
    opacity: 0.85,
  },
  viewfinderLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#282828",
    letterSpacing: 0.5,
  },

  // NFC
  nfcWrap: {
    alignItems: "center",
    justifyContent: "center",
    height: 200,
    marginVertical: 8,
  },
  nfcIcon: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: Colors.accent + "18",
    borderWidth: 2,
    borderColor: Colors.accent + "40",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accentGreen,
    flexShrink: 0,
  },
  statusText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#555",
  },

  // Link
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 20,
  },
  linkInput: {
    flex: 1,
    fontFamily: "DMMono_400Regular",
    fontSize: 13,
    color: "#fff",
  },

  // Shared buttons
  primaryBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 10,
  },
  primaryBtnDisabled: {
    backgroundColor: "#1a1a1a",
  },
  primaryBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
  ghostBtn: {
    borderWidth: 1,
    borderColor: "#1a1a1a",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  ghostBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: "#555",
  },
});
