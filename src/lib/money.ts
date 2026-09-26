export function money(value: number | string) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value) || 0);
}

export function priceWithTax(price: number, rate: number) {
  const totalPaise = toPaise(price);
  const rateBasisPoints = Math.round(rate * 100);
  const taxPaise = Math.round((totalPaise * rateBasisPoints) / (10_000 + rateBasisPoints));
  return { total: fromPaise(totalPaise), tax: fromPaise(taxPaise), totalPaise, taxPaise };
}

export function toPaise(amount: number | string) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) throw new Error("INVALID_MONEY_AMOUNT");
  return Math.round(value * 100);
}

export function fromPaise(paise: number) {
  if (!Number.isSafeInteger(paise) || paise < 0) throw new Error("INVALID_MONEY_AMOUNT");
  return paise / 100;
}

export function lineTotalPaise(unitPrice: number | string, quantity: number) {
  if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error("INVALID_QUANTITY");
  return toPaise(unitPrice) * quantity;
}

export function safeSlug(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
