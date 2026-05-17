import { formatEther } from "viem";

export function shortAddress(addr) {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function eth(wei) {
  if (wei === undefined || wei === null) return "—";
  try {
    return `${Number(formatEther(BigInt(wei))).toLocaleString(undefined, {
      maximumFractionDigits: 4,
    })} ETH`;
  } catch {
    return "—";
  }
}

export function bpsToPercent(bps) {
  if (bps === undefined || bps === null) return "—";
  return `${(Number(bps) / 100).toFixed(2)}%`;
}

export function fmtTime(unixSeconds) {
  if (!unixSeconds) return "";
  const d = new Date(Number(unixSeconds) * 1000);
  return d.toLocaleString();
}
