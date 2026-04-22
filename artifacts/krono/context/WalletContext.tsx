import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";
import {
  walletApi,
  type CardBandeira,
  type WalletCardDTO,
  type WalletDTO,
  type WalletTransactionDTO,
} from "@/lib/walletApi";

// ─── Types (kept stable for callers) ──────────────────────────────────────────

export type { CardBandeira };

export type WalletCard = {
  id: string;
  bandeira: CardBandeira;
  lastFour: string;
  titular: string;
  validade: string;
  isDefault: boolean;
  stripePaymentMethodId: string | null;
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
  addCard: (
    card: Omit<WalletCard, "id" | "isDefault" | "stripePaymentMethodId">,
    stripePaymentMethodId?: string | null,
  ) => Promise<void>;
  removeCard: (id: string) => Promise<void>;
  setDefaultCard: (id: string) => Promise<void>;
  recordDeposit: (amount: number, pixKey?: string, pixKeyType?: string) => Promise<void>;
  recordWithdrawal: (amount: number, pixKey: string, pixKeyType: string) => Promise<void>;
  refresh: () => Promise<void>;
};

function fromWalletDTO(dto: WalletDTO): Wallet {
  return {
    id: dto.id,
    balance: dto.balance,
    status: dto.status,
    currency: dto.currency,
  };
}
function fromCardDTO(dto: WalletCardDTO): WalletCard {
  return { ...dto };
}
function fromTxDTO(dto: WalletTransactionDTO): WalletTransaction {
  return {
    id: dto.id,
    type: dto.type as TransactionType,
    status: dto.status as TransactionStatus,
    amount: dto.amount,
    balanceBefore: dto.balanceBefore,
    balanceAfter: dto.balanceAfter,
    description: dto.description,
    contractId: dto.contractId,
    cardId: dto.cardId,
    pixKey: dto.pixKey,
    pixKeyType: dto.pixKeyType,
    createdAt: dto.createdAt,
  };
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [cards, setCards] = useState<WalletCard[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [w, c, t] = await Promise.all([
        walletApi.get(),
        walletApi.listCards(),
        walletApi.listTransactions(100),
      ]);
      setWallet(fromWalletDTO(w));
      setCards(c.map(fromCardDTO));
      setTransactions(t.map(fromTxDTO));
    } catch (e) {
      console.warn("[WalletContext] loadData error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsAuthed(true);
        loadData();
      } else {
        setIsAuthed(false);
        setIsLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setIsAuthed(true);
          loadData();
        } else {
          setIsAuthed(false);
          setWallet(null);
          setCards([]);
          setTransactions([]);
          setIsLoading(false);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [loadData]);

  const refresh = useCallback(async () => {
    if (isAuthed) await loadData();
  }, [isAuthed, loadData]);

  const addCard = useCallback(
    async (
      card: Omit<WalletCard, "id" | "isDefault" | "stripePaymentMethodId">,
      stripePaymentMethodId?: string | null,
    ) => {
      await walletApi.addCard({
        bandeira: card.bandeira,
        lastFour: card.lastFour,
        titular: card.titular,
        validade: card.validade,
        stripePaymentMethodId: stripePaymentMethodId ?? null,
      });
      await loadData();
    },
    [loadData],
  );

  const removeCard = useCallback(
    async (id: string) => {
      await walletApi.removeCard(id);
      await loadData();
    },
    [loadData],
  );

  const setDefaultCard = useCallback(
    async (id: string) => {
      await walletApi.setDefaultCard(id);
      await loadData();
    },
    [loadData],
  );

  const recordDeposit = useCallback(
    async (amount: number, pixKey?: string, pixKeyType?: string) => {
      await walletApi.recordDeposit({ amount, pixKey, pixKeyType });
      await loadData();
    },
    [loadData],
  );

  const recordWithdrawal = useCallback(
    async (amount: number, pixKey: string, pixKeyType: string) => {
      await walletApi.recordWithdrawal({ amount, pixKey, pixKeyType });
      await loadData();
    },
    [loadData],
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
