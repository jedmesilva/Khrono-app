import { Feather } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/lib/haptics";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { supabase } from "@/lib/supabase";
import { Contract, useContracts } from "@/context/ContractsContext";
import { ColorPalette, useTheme } from "@/context/ThemeContext";
import { formatCurrency } from "@/lib/format";
import { PaymentSheet, PaymentMethod } from "@/components/PaymentSheet";

// ── Types ──────────────────────────────────────────────────────────────────────

type Step =
  | "overview"
  | "report_paid"
  | "report_received"
  | "confirm_payment"
  | "inconsistency";

type UIPaymentState =
  | "pending"
  | "awaiting_other_party"
  | "awaiting_my_confirmation"
  | "inconsistent"
  | "confirmed"
  | "disputed";

type PaymentData = {
  paymentId: string | null;
  payerAmountReported: number | null;
  payeeAmountReported: number | null;
  hasInconsistency: boolean;
  myConfirmation: { amount_reported: number | null; is_incomplete: boolean } | null;
  otherConfirmation: { amount_reported: number | null; is_incomplete: boolean } | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  contract: Contract;
  isHiring: boolean;
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function parseAmountInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

function formatAmountInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").replace(/^0+/, "") || "0";
  const padded = digits.padStart(3, "0");
  const cents = padded.slice(-2);
  const reais = padded.slice(0, -2) || "0";
  const reaisFormatted = parseInt(reais, 10).toLocaleString("pt-BR");
  return `${reaisFormatted},${cents}`;
}

function methodLabel(m: PaymentMethod): string {
  switch (m) {
    case "cartao": return "Cartão";
    case "pix": return "Pix";
    case "dinheiro": return "Dinheiro";
    case "saldo": return "Saldo Krono";
  }
}

function methodIcon(m: PaymentMethod): React.ComponentProps<typeof Feather>["name"] {
  switch (m) {
    case "cartao": return "credit-card";
    case "pix": return "zap";
    case "saldo": return "layers";
    default: return "dollar-sign";
  }
}

function deriveUIState(
  paymentStatus: Contract["paymentStatus"],
  paymentData: PaymentData | null,
  isHiring: boolean
): UIPaymentState {
  if (paymentStatus === "disputed") return "disputed";
  if (paymentStatus === "paid") return "confirmed";

  if (!paymentData || !paymentData.paymentId) return "pending";

  const myConf = paymentData.myConfirmation;
  const otherConf = paymentData.otherConfirmation;

  if (paymentData.hasInconsistency && myConf && otherConf) return "inconsistent";

  if (myConf && !otherConf) return "awaiting_other_party";
  if (!myConf && otherConf) return "awaiting_my_confirmation";
  if (myConf && otherConf) return "confirmed";

  return "pending";
}

function statusMessage(
  uiState: UIPaymentState,
  method: PaymentMethod,
  personName: string,
  isHiring: boolean,
  colors: ColorPalette
): { text: string; color: string } {
  if (uiState === "confirmed") return { text: "Pagamento confirmado", color: colors.btnSuccessBg };
  if (uiState === "disputed") return { text: "Pagamento em disputa", color: colors.btnDangerBg };
  if (uiState === "inconsistency" as any) return { text: "Inconsistência detectada", color: colors.btnDangerBg };
  if (uiState === "inconsistent") return { text: "Inconsistência detectada — valores divergem", color: colors.btnDangerBg };
  if (uiState === "awaiting_other_party") {
    return {
      text: isHiring ? `Aguardando confirmação de ${personName}` : `Aguardando confirmação do contratante`,
      color: colors.accent,
    };
  }
  if (uiState === "awaiting_my_confirmation") {
    return {
      text: isHiring ? `${personName} informou o recebimento` : `Contratante informou o pagamento`,
      color: colors.accent,
    };
  }
  if (method === "dinheiro") {
    return {
      text: isHiring ? `À pagar para ${personName}` : `À receber do contratante`,
      color: colors.textMuted,
    };
  }
  return { text: "Pendente", color: colors.accent };
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function ContractPaymentSheet({ visible, onClose, contract, isHiring }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const {
    reportCashPaid,
    reportCashReceived,
    changeContractPaymentMethod,
    disputeCashPayment,
  } = useContracts();

  const ref = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["90%"], []);

  const [step, setStep] = useState<Step>("overview");
  const [amountInput, setAmountInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [methodSheetVisible, setMethodSheetVisible] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
    contract.paymentMethod ?? "dinheiro"
  );

  const sheetBgStyle = useMemo(
    () => ({
      backgroundColor: colors.sheetBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
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
        pressBehavior="close"
      />
    ),
    []
  );

  // Fetch payment data from Supabase
  const fetchPaymentData = useCallback(async () => {
    setFetchLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: payment } = await supabase
        .from("contract_payments")
        .select("id, payer_id, payee_id, payer_amount_reported, payee_amount_reported, has_inconsistency")
        .eq("contract_id", contract.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!payment) {
        setPaymentData({ paymentId: null, payerAmountReported: null, payeeAmountReported: null, hasInconsistency: false, myConfirmation: null, otherConfirmation: null });
        return;
      }

      const { data: confirmations } = await supabase
        .from("contract_payment_confirmations")
        .select("user_id, amount_reported, is_incomplete, confirmation_type")
        .eq("payment_id", payment.id);

      const myConf = confirmations?.find((c) => c.user_id === user.id) ?? null;
      const otherConf = confirmations?.find((c) => c.user_id !== user.id) ?? null;

      setPaymentData({
        paymentId: payment.id,
        payerAmountReported: payment.payer_amount_reported ?? null,
        payeeAmountReported: payment.payee_amount_reported ?? null,
        hasInconsistency: payment.has_inconsistency ?? false,
        myConfirmation: myConf ? { amount_reported: myConf.amount_reported ?? null, is_incomplete: myConf.is_incomplete ?? false } : null,
        otherConfirmation: otherConf ? { amount_reported: otherConf.amount_reported ?? null, is_incomplete: otherConf.is_incomplete ?? false } : null,
      });
    } finally {
      setFetchLoading(false);
    }
  }, [contract.id]);

  useEffect(() => {
    if (visible) {
      setStep("overview");
      setAmountInput("");
      setSelectedMethod(contract.paymentMethod ?? "dinheiro");
      ref.current?.present();
      fetchPaymentData();
    } else {
      ref.current?.dismiss();
    }
  }, [visible]);

  const uiState = deriveUIState(contract.paymentStatus, paymentData, isHiring);
  const contractAmount = contract.totalAmount ?? 0;
  const personName = contract.person.name;

  // ── Action: Contractor reports paying ─────────────────────────────────────────

  async function handleReportPaid() {
    const amount = parseAmountInput(amountInput);
    if (amount <= 0) return;
    setLoading(true);
    try {
      await reportCashPaid(contract.id, amount);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchPaymentData();
      setStep("overview");
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  // ── Action: Hired reports receiving ───────────────────────────────────────────

  async function handleReportReceived() {
    const amount = parseAmountInput(amountInput);
    if (amount <= 0) return;
    const isIncomplete = contractAmount > 0 && amount < contractAmount;
    setLoading(true);
    try {
      await reportCashReceived(contract.id, amount, isIncomplete);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await fetchPaymentData();
      setStep("overview");
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  // ── Action: Change payment method ─────────────────────────────────────────────

  async function handleChangeMethod(method: PaymentMethod) {
    setLoading(true);
    try {
      await changeContractPaymentMethod(contract.id, method);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSelectedMethod(method);
      await fetchPaymentData();
      setStep("overview");
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  // ── Action: Dispute ────────────────────────────────────────────────────────────

  async function handleDispute() {
    setLoading(true);
    try {
      await disputeCashPayment(contract.id, "Inconsistência no valor informado pelas partes.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      await fetchPaymentData();
      setStep("overview");
      ref.current?.dismiss();
      onClose();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  // ── Overview action button ─────────────────────────────────────────────────────

  function renderOverviewAction() {
    const isCash = selectedMethod === "dinheiro";

    if (uiState === "confirmed") {
      return (
        <View style={[styles.confirmedBadge]}>
          <Feather name="check-circle" size={16} color={colors.btnSuccessBg} />
          <Text style={[styles.confirmedText]}>Pagamento confirmado</Text>
        </View>
      );
    }

    if (uiState === "disputed") {
      return (
        <View style={[styles.disputedBadge]}>
          <Feather name="alert-triangle" size={16} color={colors.btnDangerBg} />
          <Text style={[styles.disputedText]}>Em disputa</Text>
        </View>
      );
    }

    if (uiState === "awaiting_other_party") {
      return (
        <View style={[styles.waitingBadge, { borderColor: colors.accent + "30", backgroundColor: colors.accent + "10" }]}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={[styles.waitingBadgeText, { color: colors.accent }]}>
            Aguardando a outra parte...
          </Text>
        </View>
      );
    }

    if (uiState === "inconsistent") {
      return (
        <Pressable
          onPress={() => setStep("inconsistency")}
          style={({ pressed }) => [styles.actionBtn, styles.actionBtnRed, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Feather name="alert-triangle" size={16} color={colors.btnActionText} />
          <Text style={styles.actionBtnText}>Ver inconsistência</Text>
        </Pressable>
      );
    }

    if (uiState === "awaiting_my_confirmation") {
      if (isCash) {
        const otherAmount = paymentData?.otherConfirmation?.amount_reported;
        return (
          <View style={{ gap: 10 }}>
            {otherAmount != null && (
              <View style={[styles.infoBox, { backgroundColor: colors.accent + "10", borderColor: colors.accent + "30" }]}>
                <Feather name="info" size={14} color={colors.accent} />
                <Text style={[styles.infoBoxText, { color: colors.accent }]}>
                  {isHiring
                    ? `${personName} informou que recebeu ${formatCurrency(otherAmount)}`
                    : `Contratante informou que pagou ${formatCurrency(otherAmount)}`}
                </Text>
              </View>
            )}
            <Pressable
              onPress={() => {
                const fillAmount = otherAmount ?? contractAmount;
                setAmountInput(fillAmount > 0 ? String(Math.round(fillAmount * 100)) : "");
                setStep(isHiring ? "report_paid" : "report_received");
              }}
              style={({ pressed }) => [styles.actionBtn, styles.actionBtnPrimary, { opacity: pressed ? 0.85 : 1 }]}
            >
              <Feather name="check" size={16} color={colors.btnActionText} />
              <Text style={styles.actionBtnText}>
                {isHiring ? "Confirmar pagamento" : "Confirmar recebimento"}
              </Text>
            </Pressable>
          </View>
        );
      }
    }

    if (uiState === "pending") {
      if (isCash) {
        return (
          <Pressable
            onPress={() => {
              setAmountInput(contractAmount > 0 ? String(Math.round(contractAmount * 100)) : "");
              setStep(isHiring ? "report_paid" : "report_received");
            }}
            style={({ pressed }) => [styles.actionBtn, styles.actionBtnPrimary, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name={isHiring ? "send" : "download" } size={16} color={colors.btnActionText} />
            <Text style={styles.actionBtnText}>
              {isHiring ? "Já paguei" : "Já recebi"}
            </Text>
          </Pressable>
        );
      }
      if (contract.paymentStatus === "failed") {
        return (
          <Pressable
            onPress={() => setMethodSheetVisible(true)}
            style={({ pressed }) => [styles.actionBtn, styles.actionBtnPrimary, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="credit-card" size={16} color={colors.btnActionText} />
            <Text style={styles.actionBtnText}>Pagar agora</Text>
          </Pressable>
        );
      }
    }

    return null;
  }

  // ── Step: Overview ─────────────────────────────────────────────────────────────

  function renderOverview() {
    const method = selectedMethod;
    const statusInfo = statusMessage(uiState, method, personName, isHiring, colors);

    return (
      <>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.textSecondary }]}>Pagamento</Text>
          <Pressable onPress={() => { ref.current?.dismiss(); onClose(); }} hitSlop={14}>
            <Feather name="x" size={18} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Amount — highest hierarchy */}
        <View style={styles.amountBlock}>
          {fetchLoading ? (
            <ActivityIndicator size="large" color={colors.accent} />
          ) : (
            <>
              <Text style={[styles.amountValue, { color: colors.text }]}>
                {formatCurrency(contractAmount)}
              </Text>
              <Text style={[styles.amountLabel, { color: statusInfo.color }]}>
                {statusInfo.text}
              </Text>
            </>
          )}
        </View>

        <View style={[styles.divider, { backgroundColor: colors.divider }]} />

        {/* Payment method row */}
        <View style={styles.methodRow}>
          <View style={styles.methodRowLeft}>
            <View style={[styles.methodIconWrap, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Feather name={methodIcon(method)} size={15} color={colors.textMuted} />
            </View>
            <View>
              <Text style={[styles.methodRowLabel, { color: colors.textSecondary }]}>Método</Text>
              <Text style={[styles.methodRowValue, { color: colors.text }]}>{methodLabel(method)}</Text>
            </View>
          </View>
          {isHiring && uiState !== "confirmed" && uiState !== "disputed" && (
            <Pressable
              onPress={() => setMethodSheetVisible(true)}
              style={({ pressed }) => [
                styles.changeMethodBtn,
                { borderColor: colors.surfaceBorder, backgroundColor: pressed ? colors.surface : "transparent" },
              ]}
            >
              <Text style={[styles.changeMethodText, { color: colors.accent }]}>Alterar</Text>
            </Pressable>
          )}
        </View>

        {/* Confirmations summary if applicable */}
        {paymentData && (uiState === "awaiting_other_party" || uiState === "awaiting_my_confirmation") && (
          <View style={{ gap: 6, marginTop: 2 }}>
            {paymentData.myConfirmation?.amount_reported != null && (
              <View style={[styles.confRow, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
                <Feather name="user" size={12} color={colors.btnSuccessBg} />
                <Text style={[styles.confLabel, { color: colors.textSecondary }]}>
                  Você informou:
                </Text>
                <Text style={[styles.confAmount, { color: colors.btnSuccessBg }]}>
                  {formatCurrency(paymentData.myConfirmation.amount_reported)}
                </Text>
              </View>
            )}
            {paymentData.otherConfirmation?.amount_reported != null && (
              <View style={[styles.confRow, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
                <Feather name="user" size={12} color={colors.accent} />
                <Text style={[styles.confLabel, { color: colors.textSecondary }]}>
                  {personName} informou:
                </Text>
                <Text style={[styles.confAmount, { color: colors.accent }]}>
                  {formatCurrency(paymentData.otherConfirmation.amount_reported)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Action button */}
        <View style={{ marginTop: 16 }}>
          {renderOverviewAction()}
        </View>
      </>
    );
  }

  // ── Step: Report Paid (contractor) ─────────────────────────────────────────────

  function renderReportPaid() {
    const parsed = parseAmountInput(amountInput);
    const canConfirm = parsed > 0;

    return (
      <>
        <Pressable onPress={() => setStep("overview")} style={styles.backBtn}>
          <Feather name="arrow-left" size={16} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Voltar</Text>
        </Pressable>

        <View style={styles.stepTitleBlock}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>Quanto você pagou?</Text>
          <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
            Informe o valor que você pagou a {personName}
          </Text>
        </View>

        <View style={styles.bigInputWrap}>
          <Text style={[styles.bigInputPrefix, { color: colors.textMuted }]}>R$</Text>
          <TextInput
            style={[styles.bigInput, { color: colors.text }]}
            value={formatAmountInput(amountInput)}
            onChangeText={(t) => setAmountInput(t.replace(/\D/g, ""))}
            keyboardType="numeric"
            autoFocus
            selectTextOnFocus
            placeholder="0,00"
            placeholderTextColor={colors.textDim}
          />
        </View>

        {contractAmount > 0 && (
          <Pressable
            onPress={() => setAmountInput(String(Math.round(contractAmount * 100)))}
            style={[styles.suggestBtn, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
          >
            <Text style={[styles.suggestText, { color: colors.textSecondary }]}>
              Usar valor do contrato: {formatCurrency(contractAmount)}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={canConfirm && !loading ? handleReportPaid : undefined}
          style={({ pressed }) => [
            styles.actionBtn,
            canConfirm ? styles.actionBtnPrimary : styles.actionBtnDisabled,
            { opacity: pressed && canConfirm ? 0.85 : 1, marginTop: 20 },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.btnActionText} />
          ) : (
            <>
              <Feather name="check" size={16} color={canConfirm ? colors.btnActionText : colors.textDim} />
              <Text style={[styles.actionBtnText, !canConfirm && { color: colors.textDim }]}>
                {canConfirm ? `Confirmar — paguei ${formatCurrency(parsed)}` : "Informe o valor pago"}
              </Text>
            </>
          )}
        </Pressable>
      </>
    );
  }

  // ── Step: Report Received (hired) ──────────────────────────────────────────────

  function renderReportReceived() {
    const parsed = parseAmountInput(amountInput);
    const canConfirm = parsed > 0;
    const isIncomplete = contractAmount > 0 && parsed > 0 && parsed < contractAmount;

    return (
      <>
        <Pressable onPress={() => setStep("overview")} style={styles.backBtn}>
          <Feather name="arrow-left" size={16} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Voltar</Text>
        </Pressable>

        <View style={styles.stepTitleBlock}>
          <Text style={[styles.stepTitle, { color: colors.text }]}>Quanto você recebeu?</Text>
          <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
            Informe o valor recebido do contratante
          </Text>
        </View>

        <View style={styles.bigInputWrap}>
          <Text style={[styles.bigInputPrefix, { color: colors.textMuted }]}>R$</Text>
          <TextInput
            style={[styles.bigInput, { color: colors.text }]}
            value={formatAmountInput(amountInput)}
            onChangeText={(t) => setAmountInput(t.replace(/\D/g, ""))}
            keyboardType="numeric"
            autoFocus
            selectTextOnFocus
            placeholder="0,00"
            placeholderTextColor={colors.textDim}
          />
        </View>

        {contractAmount > 0 && (
          <Pressable
            onPress={() => setAmountInput(String(Math.round(contractAmount * 100)))}
            style={[styles.suggestBtn, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface }]}
          >
            <Text style={[styles.suggestText, { color: colors.textSecondary }]}>
              Valor do contrato: {formatCurrency(contractAmount)}
            </Text>
          </Pressable>
        )}

        {isIncomplete && (
          <View style={[styles.infoBox, { backgroundColor: colors.btnDangerBg + "10", borderColor: colors.btnDangerBg + "30", marginTop: 12 }]}>
            <Feather name="alert-circle" size={14} color={colors.btnDangerBg} />
            <Text style={[styles.infoBoxText, { color: colors.btnDangerBg }]}>
              Valor abaixo do contratado — o contratante precisará confirmar
            </Text>
          </View>
        )}

        <Pressable
          onPress={canConfirm && !loading ? handleReportReceived : undefined}
          style={({ pressed }) => [
            styles.actionBtn,
            canConfirm ? (isIncomplete ? styles.actionBtnRed : styles.actionBtnPrimary) : styles.actionBtnDisabled,
            { opacity: pressed && canConfirm ? 0.85 : 1, marginTop: 20 },
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.btnActionText} />
          ) : (
            <>
              <Feather name={isIncomplete ? "alert-triangle" : "check"} size={16} color={canConfirm ? colors.btnActionText : colors.textDim} />
              <Text style={[styles.actionBtnText, !canConfirm && { color: colors.textDim }]}>
                {canConfirm
                  ? isIncomplete
                    ? `Confirmar — recebi ${formatCurrency(parsed)} (incompleto)`
                    : `Confirmar — recebi ${formatCurrency(parsed)}`
                  : "Informe o valor recebido"}
              </Text>
            </>
          )}
        </Pressable>
      </>
    );
  }

  // ── Step: Inconsistency ────────────────────────────────────────────────────────

  function renderInconsistency() {
    const myAmount = paymentData?.myConfirmation?.amount_reported ?? null;
    const otherAmount = paymentData?.otherConfirmation?.amount_reported ?? null;
    const diff = myAmount != null && otherAmount != null ? Math.abs(myAmount - otherAmount) : null;

    const payerAmount = isHiring ? myAmount : otherAmount;
    const payeeAmount = isHiring ? otherAmount : myAmount;

    return (
      <>
        <Pressable onPress={() => setStep("overview")} style={styles.backBtn}>
          <Feather name="arrow-left" size={16} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Voltar</Text>
        </Pressable>

        <View style={styles.stepTitleBlock}>
          <Text style={[styles.stepTitle, { color: colors.btnDangerBg }]}>Inconsistência detectada</Text>
          <Text style={[styles.stepSub, { color: colors.textSecondary }]}>
            Os valores informados pelas partes não batem.
          </Text>
        </View>

        <View style={[styles.inconsistencyCard, { borderColor: colors.btnDangerBg + "30", backgroundColor: colors.btnDangerBg + "08" }]}>
          <View style={styles.inconsistencyRow}>
            <Text style={[styles.inconsistencyLabel, { color: colors.textSecondary }]}>Valor do contrato</Text>
            <Text style={[styles.inconsistencyValue, { color: colors.text }]}>{formatCurrency(contractAmount)}</Text>
          </View>
          <View style={[styles.inconsistencyDivider, { backgroundColor: colors.btnDangerBg + "20" }]} />
          <View style={styles.inconsistencyRow}>
            <Text style={[styles.inconsistencyLabel, { color: colors.textSecondary }]}>
              {isHiring ? "Você informou (pagou)" : `Você informou (recebeu)`}
            </Text>
            <Text style={[styles.inconsistencyValue, { color: colors.text }]}>
              {myAmount != null ? formatCurrency(myAmount) : "—"}
            </Text>
          </View>
          <View style={styles.inconsistencyRow}>
            <Text style={[styles.inconsistencyLabel, { color: colors.textSecondary }]}>
              {isHiring ? `${personName} informou (recebeu)` : `Contratante informou (pagou)`}
            </Text>
            <Text style={[styles.inconsistencyValue, { color: colors.text }]}>
              {otherAmount != null ? formatCurrency(otherAmount) : "—"}
            </Text>
          </View>
          {diff != null && diff > 0 && (
            <>
              <View style={[styles.inconsistencyDivider, { backgroundColor: colors.btnDangerBg + "20" }]} />
              <View style={styles.inconsistencyRow}>
                <Text style={[styles.inconsistencyLabel, { color: colors.btnDangerBg, fontFamily: "DMSans_600SemiBold" }]}>
                  Diferença
                </Text>
                <Text style={[styles.inconsistencyValue, { color: colors.btnDangerBg, fontFamily: "Sora_700Bold" }]}>
                  {formatCurrency(diff)}
                </Text>
              </View>
            </>
          )}
        </View>

        <View style={{ gap: 10, marginTop: 16 }}>
          <Pressable
            onPress={() => {
              setAmountInput("");
              setStep(isHiring ? "report_paid" : "report_received");
            }}
            style={({ pressed }) => [styles.actionBtn, styles.actionBtnPrimary, { opacity: pressed ? 0.85 : 1 }]}
          >
            <Feather name="edit-2" size={16} color={colors.btnActionText} />
            <Text style={styles.actionBtnText}>Corrigir meu valor</Text>
          </Pressable>
          <Pressable
            onPress={!loading ? handleDispute : undefined}
            style={({ pressed }) => [styles.actionBtn, styles.actionBtnRedOutline, { opacity: pressed ? 0.85 : 1 }]}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.btnDangerBg} />
            ) : (
              <>
                <Feather name="flag" size={16} color={colors.btnDangerBg} />
                <Text style={[styles.actionBtnText, { color: colors.btnDangerBg }]}>Abrir disputa</Text>
              </>
            )}
          </Pressable>
        </View>
      </>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {
      case "report_paid": return renderReportPaid();
      case "report_received": return renderReportReceived();
      case "inconsistency": return renderInconsistency();
      default: return renderOverview();
    }
  }

  return (
    <>
      <BottomSheetModal
        ref={ref}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        backgroundStyle={sheetBgStyle}
        handleIndicatorStyle={handleStyle}
        onDismiss={onClose}
        enableDynamicSizing={true}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
      >
        <BottomSheetScrollView
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStep()}
        </BottomSheetScrollView>
      </BottomSheetModal>

      <PaymentSheet
        visible={methodSheetVisible}
        onClose={() => setMethodSheetVisible(false)}
        onConfirm={(newMethod) => {
          setMethodSheetVisible(false);
          handleChangeMethod(newMethod);
        }}
        initialMethod={selectedMethod}
        initialCardId={null}
        amount={contractAmount}
        recipientName={personName}
        showPixStep={false}
        hideSaldo={false}
      />
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

function createStyles(colors: ColorPalette) {
  return StyleSheet.create({
    content: {
      paddingHorizontal: 20,
      paddingTop: 8,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 20,
    },
    headerTitle: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 14,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    amountBlock: {
      alignItems: "center",
      paddingVertical: 20,
      gap: 6,
    },
    amountValue: {
      fontFamily: "Sora_700Bold",
      fontSize: 42,
      letterSpacing: -1,
      lineHeight: 48,
    },
    amountLabel: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      textAlign: "center",
    },
    divider: {
      height: 1,
      marginVertical: 16,
    },
    methodRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    methodRowLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    methodIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    methodRowLabel: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
      marginBottom: 1,
    },
    methodRowValue: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 14,
    },
    changeMethodBtn: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
    },
    changeMethodText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 12,
    },
    confRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      marginTop: 8,
    },
    confLabel: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      flex: 1,
    },
    confAmount: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 13,
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 16,
      borderRadius: 14,
    },
    actionBtnText: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 14,
      color: colors.btnActionText,
    },
    actionBtnPrimary: {
      backgroundColor: colors.accent,
    },
    actionBtnGreen: {
      backgroundColor: colors.btnSuccessBg,
    },
    actionBtnRed: {
      backgroundColor: colors.btnDangerBg,
    },
    actionBtnRedOutline: {
      borderWidth: 1,
      borderColor: colors.btnDangerBg + "50",
      backgroundColor: colors.btnDangerBg + "10",
    },
    actionBtnDisabled: {
      backgroundColor: colors.btnDisabledBg,
    },
    confirmedBadge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.btnSuccessBg + "30",
      backgroundColor: colors.btnSuccessBg + "10",
    },
    confirmedText: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 14,
      color: colors.btnSuccessBg,
    },
    disputedBadge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 16,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.btnDangerBg + "30",
      backgroundColor: colors.btnDangerBg + "10",
    },
    disputedText: {
      fontFamily: "Sora_600SemiBold",
      fontSize: 14,
      color: colors.btnDangerBg,
    },
    waitingBadge: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 16,
      borderRadius: 14,
      borderWidth: 1,
    },
    waitingBadgeText: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 13,
    },
    infoBox: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      padding: 12,
      borderRadius: 10,
      borderWidth: 1,
    },
    infoBoxText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
      flex: 1,
      lineHeight: 17,
    },
    // Sub-steps
    backBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 16,
    },
    backText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
    },
    stepTitleBlock: {
      marginBottom: 20,
    },
    stepTitle: {
      fontFamily: "Sora_700Bold",
      fontSize: 20,
      marginBottom: 4,
    },
    stepSub: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      lineHeight: 18,
    },
    bigInputWrap: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
    },
    bigInputPrefix: {
      fontFamily: "Sora_700Bold",
      fontSize: 28,
    },
    bigInput: {
      fontFamily: "Sora_700Bold",
      fontSize: 42,
      letterSpacing: -1,
      minWidth: 120,
      textAlign: "center",
    },
    suggestBtn: {
      alignSelf: "center",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      marginTop: 4,
    },
    suggestText: {
      fontFamily: "DMSans_400Regular",
      fontSize: 12,
    },
    toggleOption: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      borderRadius: 12,
      borderWidth: 1,
    },
    toggleLabel: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 13,
      marginBottom: 1,
    },
    toggleSub: {
      fontFamily: "DMSans_400Regular",
      fontSize: 11,
    },
    inconsistencyCard: {
      borderRadius: 14,
      borderWidth: 1,
      padding: 16,
      marginTop: 8,
      gap: 12,
    },
    inconsistencyRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    inconsistencyLabel: {
      fontFamily: "DMSans_400Regular",
      fontSize: 13,
      flex: 1,
    },
    inconsistencyValue: {
      fontFamily: "DMSans_600SemiBold",
      fontSize: 14,
    },
    inconsistencyDivider: {
      height: 1,
    },
  });
}
