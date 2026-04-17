import { router } from "expo-router";
import React from "react";

import { IconButton } from "@/components/IconButton";

type Props = {
  onPress?: () => void;
};

export function BackButton({ onPress }: Props) {
  return (
    <IconButton
      icon="arrow-left"
      onPress={onPress ?? (() => router.back())}
      hitSlop={8}
      backgroundColor="transparent"
    />
  );
}
