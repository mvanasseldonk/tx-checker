// Below this even a fee or a dust payment is noise: 1 satoshi, or a billionth of an ETH.
const SMALLEST_AMOUNT = 0.00000001;

/** A token amount as shown in the circle: "1.25", "1,204.5", "0.0042", "0.000046". */
export function formatAmount(amount: number): string {
  if (amount === 0) return "0";
  if (amount < SMALLEST_AMOUNT) return "<0.00000001";
  return amount.toLocaleString("en-US", amount >= 1
    ? { maximumFractionDigits: amount >= 1000 ? 2 : 4 }
    // Tiny amounts such as today's fees keep two digits that say something.
    : { maximumSignificantDigits: amount < 0.0001 ? 2 : 4 });
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

/** An ENS name cut in the middle to at most `max` characters, keeping its start and its end: asseldon…yname.eth */
export function shortName(name: string, max: number): string {
  // By character, not by UTF-16 unit, so that an emoji is never cut in two.
  const chars = Array.from(name);
  if (chars.length <= max) return name;
  const tail = Math.floor((max - 1) / 2);
  return `${chars.slice(0, max - 1 - tail).join("")}…${chars.slice(-tail).join("")}`;
}

/** Time left as shown under the status word: "~13 s", "~14 min". */
export function formatWait(seconds: number): string {
  return seconds < 60 ? `~${Math.ceil(seconds)} s` : `~${Math.ceil(seconds / 60)} min`;
}

/** When it happened, in the viewer's own time zone: "2 Nov, 14:32". */
export function formatTime(unixSeconds: number, timeZone?: string): string {
  return new Date(unixSeconds * 1000).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  });
}
