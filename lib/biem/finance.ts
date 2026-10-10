export type PricingInput = {
  cost: number;
  expenses: number;
  margin: number;
  taxRate: number;
};

export type PricingBreakdown = {
  totalCost: number;
  netPrice: number;
  taxAmount: number;
  suggestedPrice: number;
  profit: number;
};

export function clampNumber(value: number, minimum = 0, maximum = Number.MAX_SAFE_INTEGER) {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(Math.max(value, minimum), maximum);
}

export function calculatePrice({ cost, expenses, margin, taxRate }: PricingInput): PricingBreakdown {
  const safeCost = clampNumber(cost);
  const safeExpenses = clampNumber(expenses);
  const safeMargin = clampNumber(margin, 0, 95);
  const safeTax = clampNumber(taxRate, 0, 100);
  const totalCost = safeCost + safeExpenses;
  const netPrice = totalCost / Math.max(1 - safeMargin / 100, 0.05);
  const taxAmount = netPrice * (safeTax / 100);

  return {
    totalCost,
    netPrice,
    taxAmount,
    suggestedPrice: netPrice + taxAmount,
    profit: netPrice - totalCost,
  };
}

export function formatMoney(value: number) {
  return `$ ${Math.round(value).toLocaleString("es-ES")}`;
}

export function formatCompactMoney(value: number) {
  if (value >= 1000) return `$ ${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  return formatMoney(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T12:00:00`));
}

export function isoDateFromNow(days: number) {
  const next = new Date();
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

export function asNumber(value: string) {
  return clampNumber(Number(value.replace(/[^0-9.,-]/g, "").replace(",", ".")) || 0);
}
