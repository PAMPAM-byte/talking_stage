export function formatNaira(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) throw new RangeError("Use a non-negative safe integer amount in minor units.");
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2 }).format(amountMinor / 100);
}
export function parseNaira(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  const minor = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}
