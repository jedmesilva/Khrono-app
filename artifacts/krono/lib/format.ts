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
