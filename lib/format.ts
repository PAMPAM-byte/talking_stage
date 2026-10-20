export function formatNaira(amountMinor: number) {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) throw new RangeError("Use a non-negative safe integer amount in minor units.");
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2 }).format(amountMinor / 100);
}
export function parseNaira(value: string): number | null {
  const trimmed = value.trim();
  // Accept normal thousands separators without treating malformed grouping as money.
  if (trimmed.length > 40 || !/^(?:\d+|[1-9]\d{0,2}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.replaceAll(",", "").split(".");
  const minor = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
  return minor > BigInt(0) && minor <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(minor) : null;
}
