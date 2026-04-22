import { getSupabaseAdmin } from "./supabaseAdmin";

export type CardBandeira = "Visa" | "Mastercard" | "Elo" | "Amex";

export type WalletDTO = {
  id: string;
  balance: number;
  status: "active" | "suspended" | "frozen";
  currency: string;
};

export type WalletCardDTO = {
  id: string;
  bandeira: CardBandeira;
  lastFour: string;
  titular: string;
  validade: string;
  isDefault: boolean;
  stripePaymentMethodId: string | null;
};

export type WalletTransactionDTO = {
  id: string;
  type: string;
  status: string;
  amount: number;
  balanceBefore: number | null;
  balanceAfter: number | null;
  description: string | null;
  contractId: string | null;
  cardId: string | null;
  pixKey: string | null;
  pixKeyType: string | null;
  createdAt: number;
};

function mapWallet(row: any): WalletDTO {
  return {
    id: row.id,
    balance: Number(row.balance),
    status: row.status,
    currency: row.currency,
  };
}

function mapCard(row: any): WalletCardDTO {
  return {
    id: row.id,
    bandeira: row.bandeira,
    lastFour: row.last_four,
    titular: row.titular,
    validade: row.validade,
    isDefault: Boolean(row.is_default),
    stripePaymentMethodId: row.stripe_payment_method_id ?? null,
  };
}

function mapTransaction(row: any): WalletTransactionDTO {
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    amount: Number(row.amount),
    balanceBefore: row.balance_before != null ? Number(row.balance_before) : null,
    balanceAfter: row.balance_after != null ? Number(row.balance_after) : null,
    description: row.description ?? null,
    contractId: row.contract_id ?? null,
    cardId: row.card_id ?? null,
    pixKey: row.pix_key ?? null,
    pixKeyType: row.pix_key_type ?? null,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function getOrCreateWallet(userId: string): Promise<WalletDTO> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("wallets")
    .select("*")
    .eq("profile_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (data) return mapWallet(data);

  const { data: created, error: createErr } = await supabase
    .from("wallets")
    .insert({ profile_id: userId })
    .select("*")
    .single();
  if (createErr) throw new Error(createErr.message);
  return mapWallet(created);
}

export async function listCards(userId: string): Promise<WalletCardDTO[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("wallet_cards")
    .select("*")
    .eq("profile_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapCard);
}

export async function listTransactions(
  userId: string,
  limit = 100,
): Promise<WalletTransactionDTO[]> {
  const supabase = getSupabaseAdmin();
  const safeLimit = Math.min(Math.max(limit, 1), 200);
  const { data, error } = await supabase
    .from("wallet_transactions")
    .select("*")
    .eq("profile_id", userId)
    .order("created_at", { ascending: false })
    .limit(safeLimit);
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapTransaction);
}

export async function addCard(
  userId: string,
  input: {
    bandeira: CardBandeira;
    lastFour: string;
    titular: string;
    validade: string;
    stripePaymentMethodId?: string | null;
  },
): Promise<WalletCardDTO> {
  const supabase = getSupabaseAdmin();
  const existing = await listCards(userId);
  const isFirst = existing.length === 0;

  const row: Record<string, unknown> = {
    profile_id: userId,
    bandeira: input.bandeira,
    last_four: input.lastFour,
    titular: input.titular,
    validade: input.validade,
    is_default: isFirst,
    is_active: true,
  };
  if (input.stripePaymentMethodId) {
    row.stripe_payment_method_id = input.stripePaymentMethodId;
  }

  const { data, error } = await supabase
    .from("wallet_cards")
    .insert(row)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapCard(data);
}

export async function removeCard(userId: string, cardId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: card, error: fetchErr } = await supabase
    .from("wallet_cards")
    .select("*")
    .eq("id", cardId)
    .eq("profile_id", userId)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!card) throw new Error("Cartão não encontrado.");

  const { error: deleteErr } = await supabase
    .from("wallet_cards")
    .update({ is_active: false, is_default: false })
    .eq("id", cardId)
    .eq("profile_id", userId);
  if (deleteErr) throw new Error(deleteErr.message);

  if (card.is_default) {
    const remaining = await listCards(userId);
    const next = remaining[0];
    if (next) {
      const { error: setErr } = await supabase
        .from("wallet_cards")
        .update({ is_default: true })
        .eq("id", next.id)
        .eq("profile_id", userId);
      if (setErr) throw new Error(setErr.message);
    }
  }
}

export async function setDefaultCard(userId: string, cardId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: card, error: fetchErr } = await supabase
    .from("wallet_cards")
    .select("id")
    .eq("id", cardId)
    .eq("profile_id", userId)
    .eq("is_active", true)
    .maybeSingle();
  if (fetchErr) throw new Error(fetchErr.message);
  if (!card) throw new Error("Cartão não encontrado.");

  const { error: clearErr } = await supabase
    .from("wallet_cards")
    .update({ is_default: false })
    .eq("profile_id", userId);
  if (clearErr) throw new Error(clearErr.message);

  const { error: setErr } = await supabase
    .from("wallet_cards")
    .update({ is_default: true })
    .eq("id", cardId)
    .eq("profile_id", userId);
  if (setErr) throw new Error(setErr.message);
}

export async function recordDeposit(
  userId: string,
  amount: number,
  pixKey?: string | null,
  pixKeyType?: string | null,
): Promise<WalletTransactionDTO> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Valor inválido.");
  }
  const supabase = getSupabaseAdmin();
  const wallet = await getOrCreateWallet(userId);

  const { data, error } = await supabase
    .from("wallet_transactions")
    .insert({
      wallet_id: wallet.id,
      profile_id: userId,
      type: "deposit",
      status: "pending",
      amount,
      balance_before: wallet.balance,
      balance_after: wallet.balance,
      description: "Depósito via Pix",
      pix_key: pixKey ?? null,
      pix_key_type: pixKeyType ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapTransaction(data);
}

export async function recordWithdrawal(
  userId: string,
  amount: number,
  pixKey: string,
  pixKeyType: string,
): Promise<WalletTransactionDTO> {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Valor inválido.");
  }
  if (!pixKey || !pixKeyType) {
    throw new Error("Chave Pix obrigatória.");
  }
  const supabase = getSupabaseAdmin();
  const wallet = await getOrCreateWallet(userId);

  if (amount > wallet.balance) {
    throw new Error("Saldo insuficiente.");
  }

  const { data, error } = await supabase
    .from("wallet_transactions")
    .insert({
      wallet_id: wallet.id,
      profile_id: userId,
      type: "withdrawal",
      status: "pending",
      amount,
      balance_before: wallet.balance,
      balance_after: Math.max(0, wallet.balance - amount),
      description: "Saque via Pix",
      pix_key: pixKey,
      pix_key_type: pixKeyType,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapTransaction(data);
}
