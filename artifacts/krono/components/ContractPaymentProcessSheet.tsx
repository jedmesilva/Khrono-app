import { Feather } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/lib/haptics";
import QRCode from "react-native-qrcode-svg";
import { CardField, CardFieldInput } from "@stripe/stripe-react-native";
import React, {
  useCallback,
  useEffect,
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
import { useStripeCardConfirm } from "@/lib/stripePaymentSheet";
import { createStripePixPayment } from "@/lib/stripeApi";
import { PaymentMethod } from "@/components/PaymentSheet";
import { formatCurrency } from "@/lib/format";

type InternalStep = "info" | "card_input" | "processing" | "error";

type Props = {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  contractId: string | null;
  contractType: "aberto" | "definido";
  paymentMethod: PaymentMethod | null;
  totalAmount: number;
  ratePerHour: number;
  personName: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

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
  const { confirmCard, loading: cardConfirming } = useStripeCardConfirm();

  const ref = useRef<BottomSheetModal>(null);
  const [step, setStep] = useState<InternalStep>("info");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cancellingDraft, setCancellingDraft] = useState(false);

  // Card state
  const [cardClientSecret, setCardClientSecret] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);

  // Pix state
  const [pixLoading, setPixLoading] = useState(false);
  const [pixRealCode, setPixRealCode] = useState<string | null>(null);
  const [pixPaymentIntentId, setPixPaymentIntentId] = useState<string | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [pixError, setPixError] = useState<string | null>(null);

  const snapPoints = useMemo(() => ["55%", "92%"], []);

  const scenario = useMemo(
    () => getScenario(paymentMethod, contractType, totalAmount, personName, walletBalance),
    [paymentMethod, contractType, totalAmount, personName, walletBalance]
  );

  const isPixDefinido = paymentMethod === "pix" && contractType === "definido";
  const isCardDefinido = paymentMethod === "cartao" && contractType === "definido";
  const isSaldoDefinido = paymentMethod === "saldo" && contractType === "definido";
  const hasSufficientBalance = walletBalance >= totalAmount;

  // ── Load real Pix QR when sheet opens ────────────────────────────────────────

  const loadPixQr = useCallback(async () => {
    if (!contractId || !isPixDefinido || totalAmount <= 0) return;
    setPixLoading(true);
    setPixRealCode(null);
    setPixPaymentIntentId(null);
    setPixError(null);
    try {
      const result = await createStripePixPayment({
        contractId,
        amount: totalAmount,
      });
      setPixRealCode(result.pixCode);
      setPixPaymentIntentId(result.paymentIntentId);
    } catch (e: any) {
      setPixError(e?.message ?? "Não foi possível gerar o QR Code Pix.");
    } finally {
      setPixLoading(false);
    }
  }, [contractId, isPixDefinido, totalAmount]);

  useEffect(() => {
    if (visible) {
      setStep("info");
      setErrorMessage(null);
      setPixCopied(false);
      setCardClientSecret(null);
      setCardComplete(false);
      ref.current?.present();
      if (isPixDefinido) {
        loadPixQr();
      }
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

  const handleStyle = useMemo(() => ({ height: 0, width: 0 }), []);

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

  // ── Cancel ─────────────────────────────────────────────────────────────────

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

  // ── Confirm (info step) ────────────────────────────────────────────────────

  const handleConfirm = useCallback(async () => {
    if (!contractId) return;

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
        // Create payment intent → move to card input form
        const { clientSecret } = await processPaymentForDraftContract(contractId, {
          method: "cartao",
          amount: totalAmount,
        });
        if (!clientSecret) {
          throw new Error("Não foi possível iniciar o pagamento.");
        }
        setCardClientSecret(clientSecret);
        setStep("card_input");
        return;
      }

      if (isSaldoDefinido) {
        await processPaymentForDraftContract(contractId, {
          method: "saldo",
          amount: totalAmount,
        });
      } else if (isPixDefinido) {
        // Record Pix intent in Supabase (payment confirmed via webhook)
        await processPaymentForDraftContract(contractId, {
          method: "pix",
          amount: totalAmount,
          pixPaymentIntentId: pixPaymentIntentId ?? undefined,
        });
      } else {
        await processPaymentForDraftContract(contractId, {
          method: paymentMethod ?? "dinheiro",
          amount: totalAmount,
        });
      }

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
    totalAmount,
    paymentMethod,
    pixPaymentIntentId,
    onSuccess,
  ]);

  // ── Confirm card payment (card_input step) ─────────────────────────────────

  const handleCardPay = useCallback(async () => {
    if (!contractId || !cardClientSecret) return;
    setStep("processing");
    setErrorMessage(null);

    try {
      const result = await confirmCard(cardClientSecret);
      if (!result.success) {
        if (result.canceled) {
          setStep("card_input");
          return;
        }
        setStep("error");
        setErrorMessage(result.error ?? "Pagamento recusado. Verifique os dados e tente novamente.");
        return;
      }
      await finalizeContract(contractId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSuccess();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStep("error");
      setErrorMessage(e?.message ?? "Ocorreu um erro. Tente novamente.");
    }
  }, [contractId, cardClientSecret, confirmCard, finalizeContract, onSuccess]);

  // ── Copy Pix ──────────────────────────────────────────────────────────────

  const handleCopyPix = useCallback(async () => {
    if (!pixRealCode) return;
    await Clipboard.setStringAsync(pixRealCode);
    setPixCopied(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => setPixCopied(false), 2500);
  }, [pixRealCode]);

  // ── Render: info step ──────────────────────────────────────────────────────

  const renderInfo = () => (
    <>
      <View style={[styles.iconWrap, { backgroundColor: scenario.iconBg }]}>
        <Feather name={methodIcon(paymentMethod) as any} size={28} color={scenario.iconColor} />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>{scenario.title}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{scenario.body}</Text>

      {/* PIX definido: real QR Code from Stripe */}
      {isPixDefinido && (
        <View style={[styles.qrBlock, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
          {pixLoading ? (
            <View style={styles.pixLoadingWrap}>
              <ActivityIndicator size="large" color="#00b4d8" />
              <Text style={[styles.pixLoadingText, { color: colors.textMuted }]}>Gerando QR Code Pix...</Text>
            </View>
          ) : pixError ? (
            <View style={styles.pixLoadingWrap}>
              <Feather name="alert-circle" size={28} color="#e05050" />
              <Text style={[styles.pixLoadingText, { color: "#e05050" }]}>{pixError}</Text>
              <Pressable
                onPress={loadPixQr}
                style={({ pressed }) => [styles.pixRetryBtn, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Feather name="refresh-cw" size={13} color="#00b4d8" />
                <Text style={[styles.pixRetryText, { color: "#00b4d8" }]}>Tentar novamente</Text>
              </Pressable>
            </View>
          ) : pixRealCode ? (
            <>
              <View style={styles.qrWrap}>
                <QRCode
                  value={pixRealCode}
                  size={160}
                  backgroundColor="transparent"
                  color={colors.text}
                />
              </View>

              <View style={[styles.pixKeyRow, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}>
                <Text style={[styles.pixKeyText, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="middle">
                  {pixRealCode.substring(0, 60)}...
                </Text>
                <Pressable
                  onPress={handleCopyPix}
                  style={({ pressed }) => [styles.copyBtn, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Feather name={pixCopied ? "check" : "copy"} size={14} color={pixCopied ? "#18a06b" : "#00b4d8"} />
                  <Text style={[styles.copyBtnText, { color: pixCopied ? "#18a06b" : "#00b4d8" }]}>
                    {pixCopied ? "Copiado!" : "Copiar"}
                  </Text>
                </Pressable>
              </View>

              <View style={[styles.pixAmountRow, { borderTopColor: colors.divider }]}>
                <Text style={[styles.pixAmountLabel, { color: colors.textMuted }]}>Valor a pagar</Text>
                <Text style={[styles.pixAmountValue, { color: colors.text }]}>{formatCurrency(totalAmount)}</Text>
              </View>
            </>
          ) : null}
        </View>
      )}

      {/* Amount summary for non-pix scenarios */}
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
          disabled={(isSaldoDefinido && !hasSufficientBalance) || (isPixDefinido && pixLoading)}
          style={({ pressed }) => [
            styles.confirmBtn,
            {
              backgroundColor:
                (isSaldoDefinido && !hasSufficientBalance) || (isPixDefinido && pixLoading)
                  ? colors.btnDisabledBg
                  : colors.accent,
            },
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

  // ── Render: card input step ────────────────────────────────────────────────

  const renderCardInput = () => (
    <>
      <Pressable
        onPress={() => { setStep("info"); setCardClientSecret(null); setCardComplete(false); }}
        style={styles.backRow}
      >
        <Feather name="arrow-left" size={16} color={colors.textSecondary} />
        <Text style={[styles.backText, { color: colors.textSecondary }]}>Voltar</Text>
      </Pressable>

      <View style={[styles.iconWrap, { backgroundColor: "#7c3aed15" }]}>
        <Feather name="credit-card" size={28} color="#7c3aed" />
      </View>

      <Text style={[styles.title, { color: colors.text }]}>Dados do cartão</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>
        Insira os dados do seu cartão para confirmar o pagamento de{" "}
        <Text style={{ color: colors.text, fontFamily: "Sora_700Bold" }}>
          {formatCurrency(totalAmount)}
        </Text>
        .
      </Text>

      <CardField
        postalCodeEnabled={false}
        style={styles.cardField}
        cardStyle={{
          backgroundColor: colors.card as string,
          textColor: colors.text as string,
          placeholderColor: colors.textMuted as string,
          borderColor: colors.cardBorder as string,
          borderRadius: 14,
          borderWidth: 1,
          fontSize: 16,
          cursorColor: "#7c3aed",
        }}
        onCardChange={(details: CardFieldInput.Details) => {
          setCardComplete(details.complete);
        }}
      />

      <View style={styles.actions}>
        <Pressable
          onPress={cardComplete && !cardConfirming ? handleCardPay : undefined}
          style={({ pressed }) => [
            styles.confirmBtn,
            { backgroundColor: cardComplete ? "#7c3aed" : colors.btnDisabledBg },
            { opacity: pressed && cardComplete ? 0.85 : 1 },
          ]}
        >
          {cardConfirming ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="lock" size={16} color="#fff" />
              <Text style={styles.confirmBtnText}>Confirmar pagamento</Text>
            </>
          )}
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
          <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancelar</Text>
        </Pressable>
      </View>

      <View style={[styles.secureRow, { borderTopColor: colors.divider }]}>
        <Feather name="lock" size={11} color={colors.textMuted} />
        <Text style={[styles.secureText, { color: colors.textMuted }]}>
          Pagamento processado com segurança via Stripe
        </Text>
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
        {isCardDefinido ? "Preparando o formulário de pagamento." : "Preparando seu contrato."}
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
          onPress={() => {
            setStep(cardClientSecret ? "card_input" : "info");
            setErrorMessage(null);
          }}
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
        <View style={styles.header}>
          <Text style={[styles.headerLabel, { color: colors.textMuted }]}>pagamento</Text>
          {step === "info" && cancellingDraft && (
            <ActivityIndicator size="small" color={colors.textMuted} />
          )}
        </View>

        {step === "info" && renderInfo()}
        {step === "card_input" && renderCardInput()}
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
    // Pix QR block
    qrBlock: {
      borderWidth: 1,
      borderRadius: 20,
      padding: 20,
      marginBottom: 24,
      alignItems: "center",
      gap: 16,
    },
    pixLoadingWrap: {
      alignItems: "center",
      gap: 10,
      paddingVertical: 20,
    },
    pixLoadingText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      textAlign: "center",
    },
    pixRetryBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
    },
    pixRetryText: {
      fontFamily: "DMSans_500Medium",
      fontSize: 13,
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
      gap: 5,
    },
    copyBtnText: {
      fontFamily: "DMSans_500Medium",
      fontSize: 12,
    },
    pixAmountRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      width: "100%",
      paddingTop: 14,
      borderTopWidth: 1,
    },
    pixAmountLabel: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
    },
    pixAmountValue: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 14,
    },
    // Amount summary
    amountRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 20,
    },
    amountLabel: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
    },
    amountValue: {
      fontFamily: "Sora_700Bold",
      fontSize: 18,
    },
    // Warning
    warningBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 16,
    },
    warningText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      flex: 1,
      lineHeight: 17,
    },
    // Actions
    actions: {
      gap: 10,
      marginTop: 4,
    },
    confirmBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      borderRadius: 14,
      paddingVertical: 16,
    },
    confirmBtnText: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 15,
      color: "#ffffff",
    },
    cancelBtn: {
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderRadius: 14,
      paddingVertical: 14,
    },
    cancelBtnText: {
      fontFamily: "DMSans_500Medium",
      fontSize: 14,
    },
    // Card input step
    backRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 20,
    },
    backText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 14,
    },
    cardField: {
      width: "100%",
      height: 56,
      marginBottom: 24,
    },
    secureRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      marginTop: 16,
      paddingTop: 14,
      borderTopWidth: 1,
    },
    secureText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
    },
    // Processing / error
    centeredBlock: {
      alignItems: "center",
      paddingVertical: 20,
      gap: 12,
    },
    processingIconWrap: {
      width: 80,
      height: 80,
      borderRadius: 26,
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
      lineHeight: 20,
      paddingHorizontal: 8,
    },
  });
}
