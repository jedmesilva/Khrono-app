import * as ExpoHaptics from "expo-haptics";

let hapticsEnabled = true;

export const ImpactFeedbackStyle = ExpoHaptics.ImpactFeedbackStyle;
export const NotificationFeedbackType = ExpoHaptics.NotificationFeedbackType;

export function setHapticsEnabled(enabled: boolean) {
  hapticsEnabled = enabled;
}

export function isHapticsEnabled() {
  return hapticsEnabled;
}

export async function impactAsync(style?: ExpoHaptics.ImpactFeedbackStyle) {
  if (!hapticsEnabled) return;
  return ExpoHaptics.impactAsync(style);
}

export async function notificationAsync(type?: ExpoHaptics.NotificationFeedbackType) {
  if (!hapticsEnabled) return;
  return ExpoHaptics.notificationAsync(type);
}

export async function selectionAsync() {
  if (!hapticsEnabled) return;
  return ExpoHaptics.selectionAsync();
}
