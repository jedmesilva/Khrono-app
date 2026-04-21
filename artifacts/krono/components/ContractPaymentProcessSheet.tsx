import { Feather } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/lib/haptics";
import QRCode from "react-native-qrcode-svg";
import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ColorPalette, useTheme } from "@/context/ThemeContext";
import { useContracts } from "@/context/ContractsContext";
import { useWallet } from "@/context/WalletContext";
import { useStripePaymentSheet } from "@/lib/stripePaymentSheet";
import { PaymentMethod } from "@/components/PaymentSheet";
import { formatCurrency } from "@/lib/format";

type InternalStep = "info" | "processing" | "error";

type Props = {
  visible: boolean;
  /** Called when user cancels (sheet should delete the draft contract) */
  onCancel: () => void;
  /** Called when payment is confirmed and contract is finalized */
  onSuccess: () => void;
  contractId: string | null;
  contractType: "aberto" | "definido";
  paymentMethod: PaymentMethod | null;
  /** Total amount for defined-time contracts (0 for open) */
  totalAmount: number;
  ratePerHour: number;
  personName: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildPixCode(name: string, amount: number): string {
  const first = (name ?? "pagamento").split(" ")[0].toLowerCase();
  return `00020126360014BR.GOV.BCB.PIX0114+55119${Math.floor(Math.random() * 9e8 + 1e8)}5204000053039865802BR5913${first.toUpperCase().substring(0, 13)}6009SAO PAULO62070503***6304${(amount * 100).toFixed(0).padStart(4, "0")}`;
}

function methodIcon(m: PaymentMethod | null): string {
  switch (m) {
    case "cartao":   return "credit-card";
    case "pix":      return "zap";
    case "dinheiro": return "dollar-sign";
    case "saldo":    return "briefcase";
    default:         return "credit-card";
  }
}

// ── Scenario config ───────────────────────────────────────────────────────────

type Scenario = {
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  body: string;
  confirmLabel: string;
  requiresPaymentProcessing: boolean;
};

function getScenario(
  method: PaymentMethod | null,
  type: "aberto" | "definido",
  amount: number,
  personName: string,
  walletBalance: number
): Scenario {
  const amt = formatCurrency(amount);
  const name = personName.split(" ")[0];

  if (method === "dinheiro") {
    return type === "definido"
      ? {
          icon: "dollar-sign",
          iconColor: "#18a06b",
          iconBg: "#18a06b15",
          title: "Pagamento em dinheiro",
          body: `Ao encerrar o contrato, você pagará ${amt} diretamente a ${name}. Ambos confirmarão o valor dentro do app.`,
          confirmLabel: "Entendi, enviar contrato",
          requiresPaymentProcessing: false,
        }
      : {
          icon: "dollar-sign",
          iconColor: "#18a06b",
          iconBg: "#18a06b15",
          title: "Pagamento em dinheiro",
          body: `Ao encerrar o contrato, o valor será calculado pelo tempo trabalhado e você pagará diretamente a ${name} em mãos. Ambos confirmarão o valor dentro do app.`,
          confirmLabel: "Entendi, enviar contrato",
          requiresPaymentProcessing: false,
        };
  }

  if (method === "saldo") {
    if (type === "definido") {
      const hasFunds = walletBalance >= amount;
      return {
        icon: "briefcase",
        iconColor: hasFunds ? "#e06030" : "#e05050",
        iconBg: hasFunds ? "#e0603015" : "#e0505015",
        title: "Débito do Saldo Krono",
        body: hasFunds
          ? `${amt} será debitado agora do seu Saldo Krono (saldo atual: ${formatCurrency(walletBalance)}) para iniciar o contrato.`
          : `Seu saldo atual é ${formatCurrency(walletBalance)}, mas o contrato custa ${amt}. Recarregue seu saldo ou escolha outro método.`,
        confirmLabel: hasFunds ? `Debitar ${amt}` : "Saldo insuficiente",
        requiresPaymentProcessing: true,
      };
    }
    return {
      icon: "briefcase",
      iconColor: "#e06030",
      iconBg: "#e0603015",
      title: "Saldo Krono",
      body: `O valor será calculado pelo tempo trabalhado e debitado automaticamente do seu Saldo Krono ao encerrar o contrato.`,
      confirmLabel: "Entendi, enviar contrato",
      requiresPaymentProcessing: false,
    };
  }

  if (method === "pix") {
    if (type === "definido") {
      return {
        icon: "zap",
        iconColor: "#00b4d8",
        iconBg: "#00b4d815",
        title: `Pague ${amt} via Pix`,
        body: `Escaneie o QR Code abaixo ou copie o código para pagar ${amt} a ${name}. O contrato é enviado assim que você confirmar o pagamento.`,
        confirmLabel: "Já efetuei o pagamento",
        requiresPaymentProcessing: false,
      };
    }
    return {
      icon: "zap",
      iconColor: "#00b4d8",
      iconBg: "#00b4d815",
      title: "Pagamento via Pix",
      body: `Ao encerrar o contrato, um QR Code Pix será gerado no valor do tempo trabalhado para você pagar a ${name}.`,
      confirmLabel: "Entendi, enviar contrato",
      requiresPaymentProcessing: false,
    };
  }

  if (method === "cartao") {
    if (type === "definido") {
      return {
        icon: "credit-card",
        iconColor: "#7c3aed",
        iconBg: "#7c3aed15",
        title: `Pagar ${amt} no cartão`,
        body: `${amt} será cobrado agora no seu cartão para iniciar o contrato. Você receberá a confirmação assim que o pagamento for processado.`,
        confirmLabel: `Pagar ${amt}`,
        requiresPaymentProcessing: true,
      };
    }
    return {
      icon: "credit-card",
      iconColor: "#7c3aed",
      iconBg: "#7c3aed15",
      title: "Cartão de crédito/débito",
      body: `Ao encerrar o contrato, o valor referente ao tempo trabalhado será cobrado no seu cartão registrado. Uma verificação de R$ 1,00 pode ser realizada para validar o cartão.`,
      confirmLabel: "Entendi, enviar contrato",
      requiresPaymentProcessing: false,
    };
  }

  return {
    icon: "help-circle",
    iconColor: "#888",
    iconBg: "#88888815",
    title: "Confirmação",
    body: "Confirme para enviar o contrato.",
    confirmLabel: "Confirmar",
    requiresPaymentProcessing: false,
  };
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ContractPaymentProcessSheet({
  visible,
  onCancel,
  onSuccess,
  contractId,
  contractType,
  paymentMethod,
  totalAmount,
  ratePerHour,
  personName,
}: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { finalizeContract, deleteDraftContract, processPaymentForDraftContract } = useContracts();
  const { balance: walletBalance } = useWallet();
  const { presentSheet } = useStripePaymentSheet();

  const ref = useRef<BottomSheetModal>(null);
  const [step, setStep] = useState<InternalStep>("info");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState<string>("");
  const [pixCopied, setPixCopied] = useState(false);
  const [cancellingDraft, setCancellingDraft] = useState(false);

  const snapPoints = useMemo(() => ["55%", "92%"], []);

  const scenario = useMemo(
    () => getScenario(paymentMethod, contractType, totalAmount, personName, walletBalance),
    [paymentMethod, contractType, totalAmount, personName, walletBalance]
  );

  const isPixDefinido = paymentMethod === "pix" && contractType === "definido";
  const isCardDefinido = paymentMethod === "cartao" && contractType === "definido";
  const isSaldoDefinido = paymentMethod === "saldo" && contractType === "definido";
  const hasSufficientBalance = walletBalance >= totalAmount;

  useEffect(() => {
    if (visible) {
      setStep("info");
      setErrorMessage(null);
      setPixCopied(false);
      if (isPixDefinido) {
        setPixCode(buildPixCode(personName, totalAmount));
      }
      ref.current?.present();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  const sheetBgStyle = useMemo(
    () => ({
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      borderTopWidth: 1,
      borderColor: colors.sheetBorder,
    }),
    [colors]
  );

  const handleStyle = useMemo(
    () => ({ height: 0, width: 0 }),
    [colors]
  );

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="none"
        opacity={0.78}
      />
    ),
    []
  );

  // ── Cancel: delete draft and call onCancel ─────────────────────────────────

  const handleCancel = useCallback(async () => {
    if (!contractId || cancellingDraft) return;
    setCancellingDraft(true);
    try {
      await deleteDraftContract(contractId);
    } catch {
      // best-effort
    } finally {
      setCancellingDraft(false);
      onCancel();
    }
  }, [contractId, deleteDraftContract, onCancel, cancellingDraft]);

  // ── Confirm action ─────────────────────────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    if (!contractId) return;

    // For saldo+definido with insufficient balance: block and prompt
    if (isSaldoDefinido && !hasSufficientBalance) {
      Alert.alert(
        "Saldo insuficiente",
        "Recarregue seu Saldo Krono ou escolha outro método de pagamento.",
        [{ text: "OK" }]
      );
      return;
    }

    setStep("processing");
    setErrorMessage(null);

    try {
      if (isCardDefinido) {
        // Card + definido: create payment intent → present Stripe sheet
        const { clientSecret } = await processPaymentForDraftContract(contractId, {
          method: "cartao",
          amount: totalAmount,
        });

        if (clientSecret) {
          const result = await presentSheet(clientSecret);
          if (!result.success) {
            if (result.canceled) {
              setStep("info");
              return;
            }
            setStep("error");
            setErrorMessage(result.error ?? "Pagamento recusado. Tente outro cartão.");
            return;
          }
        }
      } else if (isSaldoDefinido) {
        // Saldo + definido: debit wallet now
        await processPaymentForDraftContract(contractId, {
          method: "saldo",
          amount: totalAmount,
        });
      } else if (isPixDefinido) {
        // PIX + definido: user already paid externally, just record it
        await processPaymentForDraftContract(contractId, {
          method: "pix",
          amount: totalAmount,
        });
      } else {
        // All other scenarios (cash/saldo-open/pix-open/card-open):
        // payment happens at contract end, no processing needed now
        await processPaymentForDraftContract(contractId, {
          method: paymentMethod ?? "dinheiro",
          amount: totalAmount,
        });
      }

      // Finalize: draft → pending_signature + create delivery record
      await finalizeContract(contractId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStep("error");
      setErrorMessage(e?.message ?? "Ocorreu um erro. Tente novamente.");
    }
  }, [
    contractId,
    isCardDefinido,
    isSaldoDefinido,
    isPixDefinido,
    hasSufficientBalance,
    processPaymentForDraftContract,
    finalizeContract,
    presentSheet,
    totalAmount,
    paymentMethod,
    onSuccess,
  ]);

  const handleCopyPix = useCallback(async () => {
    await Clipboard.setStringAsync(pixCode);
    setPixCopied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setPixCopied(false), 2500);
  }, [pixCode]);

  // ── Render: info step ──────────────────────────────────────────────────────

  const renderInfo = () => (
    <>
      {/* Icon header */}
      <View style={[styles.iconWrap, { backgroundColor: scenario.iconBg }]}>
        <Feather name={methodIcon(paymentMethod) as any} size={28} color={scenario.iconColor} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{scenario.title}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{scenario.body}</Text>

      {/* PIX definido: QR Code */}
      {isPixDefinido && pixCode.length > 0 && (
        <View style={[styles.qrBlock, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
          <View style={styles.qrWrap}>
            <QRCode value={pixCode} size={160} backgroundColor="transparent" color={colors.text} />
          </View>

          <View style={[styles.pixKeyRow, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}>
            <Text style={[styles.pixKeyText, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="middle">
              {pixCode.substring(0, 60)}...
            </Text>
            <Pressable
              onPress={handleCopyPix}
              style={({ pressed }) => [styles.copyBtn, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather name={pixCopied ? "check" : "copy"} size={14} color={pixCopied ? "#18a06b" : colors.accent} />
              <Text style={[styles.copyBtnText, { color: pixCopied ? "#18a06b" : colors.accent }]}>
                {pixCopied ? "Copiado!" : "Copiar"}
              </Text>
            </Pressable>
          </View>

          <View style={[styles.pixAmountRow, { borderTopColor: colors.divider }]}>
            <Text style={[styles.pixAmountLabel, { color: colors.textMuted }]}>Valor a pagar</Text>
            <Text style={[styles.pixAmountValue, { color: colors.text }]}>{formatCurrency(totalAmount)}</Text>
          </View>
        </View>
      )}

      {/* Amount summary for non-pix scenarios with a known amount */}
      {!isPixDefinido && totalAmount > 0 && (
        <View style={[styles.amountRow, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
          <Text style={[styles.amountLabel, { color: colors.textMuted }]}>
            {contractType === "definido" ? "Valor do contrato" : "Valor/hora"}
          </Text>
          <Text style={[styles.amountValue, { color: scenario.iconColor }]}>
            {formatCurrency(contractType === "definido" ? totalAmount : ratePerHour)}
          </Text>
        </View>
      )}

      {/* Saldo insufficient warning */}
      {isSaldoDefinido && !hasSufficientBalance && (
        <View style={[styles.warningBox, { borderColor: "#e0505030", backgroundColor: "#e0505010" }]}>
          <Feather name="alert-triangle" size={14} color="#e05050" />
          <Text style={[styles.warningText, { color: "#e05050" }]}>
            Saldo insuficiente. Você precisa de {formatCurrency(totalAmount - walletBalance)} a mais.
          </Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        <Pressable
          onPress={handleConfirm}
          disabled={isSaldoDefinido && !hasSufficientBalance}
          style={({ pressed }) => [
            styles.confirmBtn,
            { backgroundColor: isSaldoDefinido && !hasSufficientBalance ? colors.btnDisabledBg : colors.accent },
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Feather name="send" size={16} color="#fff" />
          <Text style={styles.confirmBtnText}>{scenario.confirmLabel}</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            Alert.alert(
              "Cancelar contrato?",
              "O contrato rascunho será descartado.",
              [
                { text: "Não", style: "cancel" },
                { text: "Sim, cancelar", style: "destructive", onPress: handleCancel },
              ]
            );
          }}
          style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1, borderColor: colors.surfaceBorder }]}
        >
          <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
        </Pressable>
      </View>
    </>
  );

  // ── Render: processing step ────────────────────────────────────────────────

  const renderProcessing = () => (
    <View style={styles.centeredBlock}>
      <View style={[styles.processingIconWrap, { backgroundColor: colors.accent + "15" }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
      <Text style={[styles.processingTitle, { color: colors.text }]}>Processando...</Text>
      <Text style={[styles.processingBody, { color: colors.textSecondary }]}>
        {isCardDefinido ? "Aguardando confirmação do pagamento." : "Preparando seu contrato."}
      </Text>
    </View>
  );

  // ── Render: error step ─────────────────────────────────────────────────────

  const renderError = () => (
    <View style={styles.centeredBlock}>
      <View style={[styles.processingIconWrap, { backgroundColor: "#e0505015" }]}>
        <Feather name="x-circle" size={36} color="#e05050" />
      </View>
      <Text style={[styles.processingTitle, { color: colors.text }]}>Erro no processamento</Text>
      <Text style={[styles.processingBody, { color: colors.textSecondary }]}>
        {errorMessage ?? "Algo deu errado. Tente novamente."}
      </Text>

      <View style={styles.actions}>
        <Pressable
          onPress={() => { setStep("info"); setErrorMessage(null); }}
          style={({ pressed }) => [styles.confirmBtn, { backgroundColor: colors.accent, opacity: pressed ? 0.85 : 1 }]}
        >
          <Feather name="refresh-cw" size={16} color="#fff" />
          <Text style={styles.confirmBtnText}>Tentar novamente</Text>
        </Pressable>

        <Pressable
          onPress={() => {
            Alert.alert(
              "Cancelar contrato?",
              "O contrato rascunho será descartado.",
              [
                { text: "Não", style: "cancel" },
                { text: "Sim, cancelar", style: "destructive", onPress: handleCancel },
              ]
            );
          }}
          style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1, borderColor: colors.surfaceBorder }]}
        >
          <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar contrato</Text>
        </Pressable>
      </View>
    </View>
  );

  if (!visible) return null;

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={sheetBgStyle}
      handleIndicatorStyle={handleStyle}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Sheet header with label */}
        <View style={styles.header}>
          <Text style={[styles.headerLabel, { color: colors.textMuted }]}>pagamento</Text>
          {step === "info" && cancellingDraft && (
            <ActivityIndicator size="small" color={colors.textMuted} />
          )}
        </View>

        {step === "info" && renderInfo()}
        {step === "processing" && renderProcessing()}
        {step === "error" && renderError()}
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    scrollContent: {
      paddingHorizontal: 24,
      paddingTop: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 24,
    },
    headerLabel: {
      fontFamily: "DMSans_400Regular",
      fontSize: 10,
      letterSpacing: 2,
      textTransform: "uppercase",
    },
    iconWrap: {
      width: 68,
      height: 68,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: 20,
    },
    title: {
      fontFamily: "Sora_700Bold",
      fontSize: 20,
      textAlign: "center",
      marginBottom: 10,
      lineHeight: 28,
    },
    body: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      lineHeight: 20,
      textAlign: "center",
      marginBottom: 24,
    },
    qrBlock: {
      borderWidth: 1,
      borderRadius: 20,
      padding: 20,
      marginBottom: 24,
      alignItems: "center",
      gap: 16,
    },
    qrWrap: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: "#ffffff",
    },
    pixKeyRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      width: "100%",
    },
    pixKeyText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      flex: 1,
    },
    copyBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    copyBtnText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 12,
    },
    pixAmountRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingTop: 14,
      borderTopWidth: 1,
      width: "100%",
    },
    pixAmountLabel: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
    },
    pixAmountValue: {
      fontFamily: "Sora_700Bold",
      fontSize: 18,
    },
    amountRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 18,
      paddingVertical: 14,
      marginBottom: 24,
    },
    amountLabel: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
    },
    amountValue: {
      fontFamily: "Sora_700Bold",
      fontSize: 22,
    },
    warningBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 16,
    },
    warningText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      flex: 1,
      lineHeight: 17,
    },
    actions: {
      gap: 10,
      marginTop: 4,
    },
    confirmBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 16,
      borderRadius: 16,
    },
    confirmBtnText: {
      fontFamily: "Sora_700Bold",
      fontSize: 15,
      color: "#ffffff",
    },
    cancelBtn: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      borderRadius: 14,
      borderWidth: 1,
    },
    cancelBtnText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
    },
    centeredBlock: {
      alignItems: "center",
      paddingTop: 16,
      gap: 12,
    },
    processingIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8,
    },
    processingTitle: {
      fontFamily: "Sora_700Bold",
      fontSize: 18,
      textAlign: "center",
    },
    processingBody: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      textAlign: "center",
      lineHeight: 19,
      marginBottom: 16,
    },
  });
}
