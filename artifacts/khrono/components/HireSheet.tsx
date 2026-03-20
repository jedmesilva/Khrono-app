import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
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

type Props = {
  open: boolean;
  onClose: () => void;
};

type Mode = "menu" | "pincode" | "confirm";

export function HireSheet({ open, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { startContract } = useContracts();
  const [mode, setMode] = useState<Mode>("menu");
  const [pinInput, setPinInput] = useState("");
  const [foundUser, setFoundUser] = useState<typeof MOCK_USERS[string] | null>(null);
  const [disponivel, setDisponivel] = useState(false);
  const isIOS = Platform.OS === "ios";

  const handleClose = () => {
    setMode("menu");
    setPinInput("");
    setFoundUser(null);
    onClose();
  };

  const handlePinSearch = () => {
    const user = MOCK_USERS[pinInput];
    if (user) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFoundUser(user);
      setMode("confirm");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("PIN não encontrado", "Verifique o código e tente novamente.");
    }
  };

  const handleConfirm = () => {
    if (!foundUser) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    startContract({
      role: "hiring",
      person: {
        name: foundUser.name,
        initials: foundUser.initials,
        skill: foundUser.skill,
      },
      ratePerHour: foundUser.ratePerHour,
    });
    handleClose();
  };

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose} />
      <KeyboardAvoidingView
        behavior={isIOS ? "padding" : undefined}
        style={styles.keyboardView}
        pointerEvents="box-none"
      >
        <View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 16 },
          ]}
        >
          <View style={styles.handle} />

          {mode === "menu" && (
            <MenuMode
              disponivel={disponivel}
              setDisponivel={setDisponivel}
              onSelectPincode={() => setMode("pincode")}
              onSelectOther={() =>
                Alert.alert("Em breve", "Esta funcionalidade estará disponível em breve.")
              }
            />
          )}

          {mode === "pincode" && (
            <PincodeMode
              pinInput={pinInput}
              setPinInput={setPinInput}
              onSearch={handlePinSearch}
              onBack={() => setMode("menu")}
            />
          )}

          {mode === "confirm" && foundUser && (
            <ConfirmMode
              user={foundUser}
              onConfirm={handleConfirm}
              onBack={() => setMode("menu")}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function MenuMode({
  disponivel,
  setDisponivel,
  onSelectPincode,
  onSelectOther,
}: {
  disponivel: boolean;
  setDisponivel: (v: boolean) => void;
  onSelectPincode: () => void;
  onSelectOther: () => void;
}) {
  const hireOptions = [
    { icon: "hash" as const, label: "PINCODE", onPress: onSelectPincode },
    { icon: "link" as const, label: "LINK", onPress: onSelectOther },
    { icon: "wifi" as const, label: "NFC", onPress: onSelectOther },
  ];

  const availOptions = [
    { icon: "hash" as const, label: "Meu PIN", value: "1257" },
    { icon: "link" as const, label: "Compartilhar Link", value: null },
    { icon: "wifi" as const, label: "Aproximação NFC", value: null },
  ];

  return (
    <ScrollView showsVerticalScrollIndicator={false} style={styles.menuScroll}>
      <Text style={styles.sheetTitle}>Contratação direta</Text>

      {/* AI Card */}
      <Pressable
        style={styles.aiCard}
        onPress={() =>
          Alert.alert("IA em breve", "A busca por IA estará disponível em breve.")
        }
      >
        <View style={styles.aiIconWrap}>
          <Feather name="zap" size={20} color={Colors.accent} />
        </View>
        <View style={styles.aiCardText}>
          <Text style={styles.aiCardTitle}>Descrever o que preciso</Text>
          <Text style={styles.aiCardDesc}>
            A IA entende sua necessidade e encontra a pessoa certa
          </Text>
        </View>
        <Feather name="chevron-right" size={16} color={Colors.accent + "80"} />
      </Pressable>

      {/* Divider */}
      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>OU CONTRATAR DIRETO</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Hire options grid */}
      <View style={styles.optionGrid}>
        {hireOptions.map((opt) => (
          <Pressable
            key={opt.label}
            style={styles.optionGridItem}
            onPress={opt.onPress}
          >
            <Feather name={opt.icon} size={22} color={Colors.accent} />
            <Text style={styles.optionGridLabel}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Availability section */}
      <View style={styles.availHeader}>
        <Text style={styles.availTitle}>Disponibilidade</Text>
        <Pressable
          style={styles.toggleRow}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setDisponivel(!disponivel);
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
            <View
              style={[
                styles.toggleThumb,
                { left: disponivel ? 19 : 3 },
              ]}
            />
          </View>
        </Pressable>
      </View>

      <View style={{ opacity: disponivel ? 1 : 0.3, gap: 8, marginBottom: 8 }}>
        {availOptions.map((opt) => (
          <Pressable
            key={opt.label}
            style={styles.availOption}
            onPress={() => {
              if (!disponivel) return;
              if (opt.value) {
                Alert.alert("Seu PIN", `Informe o código ${opt.value} para quem deseja te contratar.`);
              } else {
                Alert.alert("Em breve", "Esta funcionalidade estará disponível em breve.");
              }
            }}
          >
            <View style={styles.availIconWrap}>
              {opt.value ? (
                <Text style={styles.pinValueText}>{opt.value}</Text>
              ) : (
                <Feather name={opt.icon} size={22} color={Colors.accentGreen} />
              )}
            </View>
            <View>
              <Text style={styles.availOptionLabel}>{opt.label}</Text>
              {opt.value && (
                <Text style={styles.availOptionDesc}>
                  Código temporário para contratação direta
                </Text>
              )}
            </View>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function PincodeMode({
  pinInput,
  setPinInput,
  onSearch,
  onBack,
}: {
  pinInput: string;
  setPinInput: (v: string) => void;
  onSearch: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.subMode}>
      <View style={styles.subHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color={Colors.accent} />
        </Pressable>
        <Text style={styles.sheetTitle}>Inserir PIN</Text>
      </View>
      <Text style={styles.subDesc}>
        Peça ao prestador de serviço seu código PIN temporário e insira abaixo
      </Text>

      <TextInput
        style={styles.pinInput}
        value={pinInput}
        onChangeText={setPinInput}
        placeholder="0000"
        placeholderTextColor="#333"
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />

      <Pressable
        style={[
          styles.confirmBtn,
          { opacity: pinInput.length >= 4 ? 1 : 0.4 },
        ]}
        disabled={pinInput.length < 4}
        onPress={onSearch}
      >
        <Text style={styles.confirmBtnText}>Buscar prestador</Text>
      </Pressable>
    </View>
  );
}

function ConfirmMode({
  user,
  onConfirm,
  onBack,
}: {
  user: { name: string; initials: string; skill: string; ratePerHour: number };
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <View style={styles.subMode}>
      <View style={styles.subHeader}>
        <Pressable onPress={onBack} style={styles.backBtn}>
          <Feather name="arrow-left" size={18} color={Colors.accent} />
        </Pressable>
        <Text style={styles.sheetTitle}>Confirmar contrato</Text>
      </View>

      <View style={styles.userCard}>
        <View style={styles.userAvatarLarge}>
          <Text style={styles.userAvatarText}>{user.initials}</Text>
        </View>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.userSkill}>{user.skill}</Text>
        <View style={styles.userRateBadge}>
          <Text style={styles.userRate}>R${user.ratePerHour}/h</Text>
        </View>
      </View>

      <Text style={styles.confirmDesc}>
        Ao confirmar, o cronômetro inicia imediatamente e o valor será calculado por tempo corrido.
      </Text>

      <Pressable style={styles.confirmBtn} onPress={onConfirm}>
        <Feather name="zap" size={16} color="#fff" />
        <Text style={styles.confirmBtnText}>Iniciar contrato</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  keyboardView: {
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#0f0f0f",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  menuScroll: {
    maxHeight: "100%",
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
    borderColor: Colors.accent + "30",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
  },
  aiIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accent + "18",
    borderWidth: 1,
    borderColor: Colors.accent + "35",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  aiCardText: {
    flex: 1,
  },
  aiCardTitle: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 14,
    color: "#fff",
    marginBottom: 3,
  },
  aiCardDesc: {
    fontFamily: "DMMono_400Regular",
    fontSize: 11,
    color: "#555",
    lineHeight: 16,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#1e1e1e",
  },
  dividerText: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#333",
    letterSpacing: 1,
  },
  optionGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 28,
  },
  optionGridItem: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    gap: 8,
  },
  optionGridLabel: {
    fontFamily: "DMMono_400Regular",
    fontSize: 9,
    color: "#666",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  availHeader: {
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
    letterSpacing: 0.5,
  },
  toggle: {
    width: 40,
    height: 22,
    borderRadius: 11,
    position: "relative",
  },
  toggleThumb: {
    position: "absolute",
    top: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#000",
  },
  availOption: {
    backgroundColor: "#0d0d0d",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  availIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#161616",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pinValueText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 16,
    color: Colors.accent,
    fontWeight: "800",
    letterSpacing: 2,
  },
  availOptionLabel: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 13,
    color: "#fff",
    marginBottom: 2,
  },
  availOptionDesc: {
    fontFamily: "DMMono_400Regular",
    fontSize: 10,
    color: "#555",
    lineHeight: 14,
  },
  subMode: {
    gap: 0,
  },
  subHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    padding: 4,
  },
  subDesc: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#666",
    lineHeight: 18,
    marginBottom: 24,
  },
  pinInput: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#2a2a2a",
    borderRadius: 14,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontFamily: "DMMono_500Medium",
    fontSize: 28,
    color: "#fff",
    letterSpacing: 8,
    textAlign: "center",
    marginBottom: 16,
  },
  userCard: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#1e1e1e",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  userAvatarLarge: {
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
    fontWeight: "700",
  },
  userName: {
    fontFamily: "Sora_700Bold",
    fontSize: 18,
    color: "#fff",
  },
  userSkill: {
    fontFamily: "DMMono_400Regular",
    fontSize: 12,
    color: "#666",
  },
  userRateBadge: {
    backgroundColor: Colors.accent + "15",
    borderWidth: 1,
    borderColor: Colors.accent + "30",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginTop: 8,
  },
  userRate: {
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
  confirmBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  confirmBtnText: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 15,
    color: "#fff",
  },
});
