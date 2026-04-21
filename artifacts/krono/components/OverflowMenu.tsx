import { Feather } from "@expo/vector-icons";
import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "@/context/ThemeContext";

export type OverflowMenuItem = {
  label: string;
  icon?: keyof typeof Feather.glyphMap;
  destructive?: boolean;
  onPress: () => void;
};

type Props = {
  visible: boolean;
  onDismiss: () => void;
  items: OverflowMenuItem[];
  anchorTop?: number;
  anchorRight?: number;
};

const DESTRUCTIVE = "#e06030";

export function OverflowMenu({
  visible,
  onDismiss,
  items,
  anchorTop,
  anchorRight = 14,
}: Props) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const top = anchorTop ?? insets.top + 52;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={[
            styles.menu,
            {
              top,
              right: anchorRight,
              backgroundColor: colors.sheetBg,
              borderColor: colors.sheetBorder,
              shadowOpacity: isDark ? 0.4 : 0.18,
            },
          ]}
        >
          {items.map((item, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <View
                  style={[styles.divider, { backgroundColor: colors.divider }]}
                />
              )}
              <Pressable
                onPress={() => {
                  onDismiss();
                  item.onPress();
                }}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { backgroundColor: colors.rowPressed },
                ]}
              >
                {item.icon && (
                  <Feather
                    name={item.icon}
                    size={16}
                    color={item.destructive ? DESTRUCTIVE : colors.text}
                  />
                )}
                <Text
                  style={[
                    styles.label,
                    {
                      color: item.destructive ? DESTRUCTIVE : colors.text,
                      fontFamily: item.destructive
                        ? "DMSans_500Medium"
                        : "DMSans_400Regular",
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            </React.Fragment>
          ))}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  menu: {
    position: "absolute",
    minWidth: 200,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  label: {
    fontSize: 14,
    letterSpacing: -0.1,
  },
  divider: {
    height: 1,
    marginHorizontal: 12,
  },
});
