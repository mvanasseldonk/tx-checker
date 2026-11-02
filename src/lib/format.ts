/** A token amount as shown in the circle: "1.25", "1,204.5", "0.0042". */
export function formatAmount(amount: number): string {
  if (amount === 0) return "0";
  if (amount < 0.0001) return "<0.0001";
  return amount.toLocaleString("en-US", amount >= 1
    ? { maximumFractionDigits: amount >= 1000 ? 2 : 4 }
    : { maximumSignificantDigits: 4 });
}

/** A euro value: whole euros from €100 up, cents below. */
export function formatEur(eur: number): string {
  if (eur > 0 && eur < 0.01) return "<€0.01";
  return eur.toLocaleString("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: eur >= 100 ? 0 : 2,
    minimumFractionDigits: eur >= 100 ? 0 : 2,
  });
}

/** 0x12ab…9f3c */
export function shortAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
