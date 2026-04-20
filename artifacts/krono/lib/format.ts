const brlFull = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const brlNoDecimals = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return brlFull.format(value);
}

export function formatRateValue(value: number): string {
  return brlNoDecimals.format(value);
}

export function formatRate(value: number): string {
  return `${brlNoDecimals.format(value)}/h`;
}

/**
 * Currency input masking — "centavos" style (Brazilian standard).
 * Receives a string of raw digit characters and returns a formatted
 * display string like "1.234,56".
 * The caller stores only the raw digits; the display value is derived.
 *
 * Example: "12345" → "123,45"  |  "" → "0,00"
 */
export function formatAmountInput(digits: string): string {
  const cents = parseInt(digits || "0", 10);
  const reais = cents / 100;
  return reais.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Extracts the numeric value (in reais) from a formatted amount-input string.
 */
export function parseAmountInput(digits: string): number {
  return parseInt(digits || "0", 10) / 100;
}

/**
 * Masks a string as a Brazilian CPF: 000.000.000-00
 */
export function maskCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/**
 * Masks a string as a Brazilian phone number.
 * Mobile (11 digits): (00) 00000-0000
 * Landline (10 digits): (00) 0000-0000
 */
export function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
