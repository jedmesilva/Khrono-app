import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useTheme } from "@/context/ThemeContext";

export type AppDialogButton = {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AppDialogButton[];
  onDismiss: () => void;
};

export function AppDialog({ visible, title, message, buttons, onDismiss }: Props) {
  const { colors } = useTheme();
  const btns = buttons && buttons.length > 0 ? buttons : [{ text: "OK" }];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.card, { backgroundColor: colors.sheetBg, borderColor: colors.sheetBorder }]}>
          <View style={styles.body}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            {message ? (
              <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
            ) : null}
          </View>
          <View style={[styles.divider, { backgroundColor: colors.divider }]} />
          <View style={styles.btnRow}>
            {btns.map((btn, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={[styles.btnSep, { backgroundColor: colors.divider }]} />}
                <Pressable
                  style={({ pressed }) => [
                    styles.btn,
                    pressed && { backgroundColor: colors.rowPressed },
                  ]}
                  onPress={() => {
                    btn.onPress?.();
                    onDismiss();
                  }}
                >
                  <Text
                    style={[
                      styles.btnText,
                      btn.style === "cancel"
                        ? { color: colors.textSecondary }
                        : { color: "#ff6b35" },
                    ]}
                  >
                    {btn.text}
                  </Text>
                </Pressable>
              </React.Fragment>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  body: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 20,
    gap: 8,
  },
  title: {
    fontFamily: "Sora_600SemiBold",
    fontSize: 17,
    letterSpacing: -0.3,
  },
  message: {
    fontFamily: "DMMono_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  divider: {
    height: 1,
  },
  btnRow: {
    flexDirection: "row",
  },
  btn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnSep: {
    width: 1,
  },
  btnText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 13,
    letterSpacing: 0.5,
  },
});
