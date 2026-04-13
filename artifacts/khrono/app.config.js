/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  name: "Khrono",
  slug: "khrono",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: "khrono",
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/splash-icon.png",
    resizeMode: "contain",
    backgroundColor: "#060606",
  },
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.khrono.app",
  },
  android: {
    backgroundColor: "#060606",
    package: "com.khrono.app",
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? undefined,
  },
  web: {
    favicon: "./assets/images/icon.png",
  },
  plugins: [
    "expo-router",
    "expo-font",
    "expo-web-browser",
    [
      "expo-camera",
      {
        cameraPermission:
          "O Khrono precisa da câmera para escanear QR Codes de usuários.",
        microphonePermission: false,
        recordAudioAndroid: false,
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon.png",
        color: "#e06030",
        defaultChannel: "default",
        sounds: [],
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? undefined,
    },
  },
};
