import { apiFetch } from "@/lib/apiClient";

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

export const walletApi = {
  get(): Promise<WalletDTO> {
    return apiFetch<WalletDTO>("/api/wallet");
  },
  listCards(): Promise<WalletCardDTO[]> {
    return apiFetch<WalletCardDTO[]>("/api/wallet/cards");
  },
  addCard(input: {
    bandeira: CardBandeira;
    lastFour: string;
    titular: string;
    validade: string;
    stripePaymentMethodId?: string | null;
  }): Promise<WalletCardDTO> {
    return apiFetch<WalletCardDTO>("/api/wallet/cards", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  removeCard(id: string): Promise<{ ok: true }> {
    return apiFetch(`/api/wallet/cards/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  },
  setDefaultCard(id: string): Promise<{ ok: true }> {
    return apiFetch(`/api/wallet/cards/${encodeURIComponent(id)}/default`, {
      method: "POST",
    });
  },
  listTransactions(limit = 100): Promise<WalletTransactionDTO[]> {
    return apiFetch<WalletTransactionDTO[]>(
      `/api/wallet/transactions?limit=${limit}`,
    );
  },
  recordDeposit(input: {
    amount: number;
    pixKey?: string;
    pixKeyType?: string;
  }): Promise<WalletTransactionDTO> {
    return apiFetch<WalletTransactionDTO>("/api/wallet/deposits", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  recordWithdrawal(input: {
    amount: number;
    pixKey: string;
    pixKeyType: string;
  }): Promise<WalletTransactionDTO> {
    return apiFetch<WalletTransactionDTO>("/api/wallet/withdrawals", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
