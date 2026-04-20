import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CardBandeira = "Visa" | "Mastercard" | "Elo" | "Amex";

export type WalletCard = {
  id: string;
  bandeira: CardBandeira;
  lastFour: string;
  titular: string;
  validade: string;
  isDefault: boolean;
};

export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "contract_payment"
  | "contract_receipt"
  | "refund"
  | "chargeback";

export type TransactionStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "refunded";

export type WalletTransaction = {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
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

export type Wallet = {
  id: string;
  balance: number;
  status: "active" | "suspended" | "frozen";
  currency: string;
};

type WalletContextType = {
  wallet: Wallet | null;
  balance: number;
  cards: WalletCard[];
  transactions: WalletTransaction[];
  isLoading: boolean;
  addCard: (card: Omit<WalletCard, "id" | "isDefault">) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  setDefaultCard: (id: string) => Promise<void>;
  recordDeposit: (amount: number, pixKey?: string, pixKeyType?: string) => Promise<void>;
  recordWithdrawal: (amount: number, pixKey: string, pixKeyType: string) => Promise<void>;
  refresh: () => Promise<void>;
};

// ─── Mappers ─────────────────────────────────────────────────────────────────

function mapCard(row: any): WalletCard {
  return {
    id: row.id,
    bandeira: row.bandeira as CardBandeira,
    lastFour: row.last_four,
    titular: row.titular,
    validade: row.validade,
    isDefault: row.is_default,
  };
}

function mapTransaction(row: any): WalletTransaction {
  return {
    id: row.id,
    type: row.type as TransactionType,
    status: row.status as TransactionStatus,
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

function mapWallet(row: any): Wallet {
  return {
    id: row.id,
    balance: Number(row.balance),
    status: row.status as Wallet["status"],
    currency: row.currency,
  };
}

// ─── Context ─────────────────────────────────────────────────────────────────

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [cards, setCards] = useState<WalletCard[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const [walletRes, cardsRes, txRes] = await Promise.all([
        supabase
          .from("wallets")
          .select("*")
          .eq("profile_id", userId)
          .single(),
        supabase
          .from("wallet_cards")
          .select("*")
          .eq("profile_id", userId)
          .eq("is_active", true)
          .order("created_at", { ascending: true }),
        supabase
          .from("wallet_transactions")
          .select("*")
          .eq("profile_id", userId)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (walletRes.data) {
        setWallet(mapWallet(walletRes.data));
      } else if (walletRes.error?.code === "PGRST116") {
        // Wallet doesn't exist yet — create it
        const { data: newWallet, error: createErr } = await supabase
          .from("wallets")
          .insert({ profile_id: userId })
          .select()
          .single();
        if (newWallet && !createErr) {
          setWallet(mapWallet(newWallet));
        }
      }

      if (cardsRes.data) setCards(cardsRes.data.map(mapCard));
      if (txRes.data) setTransactions(txRes.data.map(mapTransaction));
    } catch (e) {
      console.warn("[WalletContext] loadData error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) loadData(user.id);
      else setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadData(session.user.id);
      } else {
        setWallet(null);
        setCards([]);
        setTransactions([]);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadData]);

  const refresh = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await loadData(user.id);
  }, [loadData]);

  // ── Cards ────────────────────────────────────────────────────────────────

  const addCard = useCallback(
    async (card: Omit<WalletCard, "id" | "isDefault">) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const isFirst = cards.length === 0;

      const { error } = await supabase.from("wallet_cards").insert({
        profile_id: user.id,
        bandeira: card.bandeira,
        last_four: card.lastFour,
        titular: card.titular,
        validade: card.validade,
        is_default: isFirst,
      });

      if (error) throw new Error(error.message);
      await loadData(user.id);
    },
    [cards.length, loadData]
  );

  const removeCard = useCallback(
    async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const card = cards.find((c) => c.id === id);
      await supabase
        .from("wallet_cards")
        .update({ is_active: false, is_default: false })
        .eq("id", id);

      if (card?.isDefault) {
        const next = cards.find((c) => c.id !== id);
        if (next) {
          await supabase
            .from("wallet_cards")
            .update({ is_default: true })
            .eq("id", next.id);
        }
      }

      await loadData(user.id);
    },
    [cards, loadData]
  );

  const setDefaultCard = useCallback(
    async (id: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("wallet_cards")
        .update({ is_default: false })
        .eq("profile_id", user.id);
      await supabase
        .from("wallet_cards")
        .update({ is_default: true })
        .eq("id", id);

      await loadData(user.id);
    },
    [loadData]
  );

  // ── Transactions ─────────────────────────────────────────────────────────

  const recordDeposit = useCallback(
    async (amount: number, pixKey?: string, pixKeyType?: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !wallet) return;

      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        profile_id: user.id,
        type: "deposit",
        status: "pending",
        amount,
        balance_before: wallet.balance,
        balance_after: wallet.balance,
        description: "Depósito via Pix",
        pix_key: pixKey ?? null,
        pix_key_type: pixKeyType ?? null,
      });

      await loadData(user.id);
    },
    [wallet, loadData]
  );

  const recordWithdrawal = useCallback(
    async (amount: number, pixKey: string, pixKeyType: string) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || !wallet) return;

      await supabase.from("wallet_transactions").insert({
        wallet_id: wallet.id,
        profile_id: user.id,
        type: "withdrawal",
        status: "pending",
        amount,
        balance_before: wallet.balance,
        balance_after: Math.max(0, wallet.balance - amount),
        description: "Saque via Pix",
        pix_key: pixKey,
        pix_key_type: pixKeyType,
      });

      await loadData(user.id);
    },
    [wallet, loadData]
  );

  return (
    <WalletContext.Provider
      value={{
        wallet,
        balance: wallet?.balance ?? 0,
        cards,
        transactions,
        isLoading,
        addCard,
        removeCard,
        setDefaultCard,
        recordDeposit,
        recordWithdrawal,
        refresh,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
