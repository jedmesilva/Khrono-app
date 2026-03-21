import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import Colors from "@/constants/colors";

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
        <View style={styles.card}>
          <View style={styles.body}>
            <Text style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
          <View style={styles.divider} />
          <View style={styles.btnRow}>
            {btns.map((btn, i) => (
              <React.Fragment key={i}>
                {i > 0 && <View style={styles.btnSep} />}
                <Pressable
                  style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
                  onPress={() => {
                    btn.onPress?.();
                    onDismiss();
                  }}
                >
                  <Text
                    style={[
                      styles.btnText,
                      btn.style === "cancel" ? styles.btnTextCancel : styles.btnTextAccent,
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
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    backgroundColor: "#0f0f0f",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e1e1e",
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
    color: "#fff",
    letterSpacing: -0.3,
  },
  message: {
    fontFamily: "DMMono_400Regular",
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: "#1a1a1a",
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
  btnPressed: {
    backgroundColor: "#161616",
  },
  btnSep: {
    width: 1,
    backgroundColor: "#1a1a1a",
  },
  btnText: {
    fontFamily: "DMMono_500Medium",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  btnTextAccent: {
    color: Colors.accent,
  },
  btnTextCancel: {
    color: "#555",
  },
});
