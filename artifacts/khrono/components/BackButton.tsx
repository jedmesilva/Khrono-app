import { router } from "expo-router";
import React from "react";

import { SimpleIconButton } from "@/components/SimpleIconButton";

type Props = {
  onPress?: () => void;
};

export function BackButton({ onPress }: Props) {
  return (
    <SimpleIconButton
      icon="arrow-left"
      onPress={onPress ?? (() => router.back())}
    />
  );
}
