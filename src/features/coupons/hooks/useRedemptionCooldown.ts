import { useEffect, useMemo, useState } from "react";

export interface CooldownState {
  isCooldownActive: boolean;
  canRedeem: boolean;
  secondsLeft: number;
  formattedCountdown: string;
}

export function formatCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "0s";
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * Robust hook for computing real-time live countdown and auto-enabling redeem buttons:
 * - Listens to redemptionAvailableAt ISO timestamp.
 * - Updates every 1 second while cooldown is active.
 * - Automatically flips `canRedeem` to true when cooldown hits 0 without requiring a screen refresh.
 */
export function useRedemptionCooldown(
  redemptionAvailableAt?: string | null,
  isRedeemed = false,
  redemptionFrequency = "ONE_TIME"
): CooldownState {
  const [now, setNow] = useState<number>(Date.now());

  const availableAtTimestamp = useMemo(() => {
    if (!redemptionAvailableAt) return NaN;
    const parsed = Date.parse(redemptionAvailableAt);
    return Number.isFinite(parsed) ? parsed : NaN;
  }, [redemptionAvailableAt]);

  const hasValidFutureTimestamp =
    Number.isFinite(availableAtTimestamp) && availableAtTimestamp > now;

  useEffect(() => {
    if (!hasValidFutureTimestamp) return;

    const interval = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= availableAtTimestamp) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hasValidFutureTimestamp, availableAtTimestamp]);

  const secondsLeft = Number.isFinite(availableAtTimestamp)
    ? Math.max(0, Math.ceil((availableAtTimestamp - now) / 1000))
    : 0;

  const isUnlimited = redemptionFrequency?.toUpperCase() === "UNLIMITED";
  const isOneTime = redemptionFrequency?.toUpperCase() === "ONE_TIME";

  // Active cooldown: user redeemed and there is time remaining until next redemption
  const isCooldownActive = isRedeemed && secondsLeft > 0;

  // Can redeem:
  // 1. Never redeemed yet (!isRedeemed)
  // 2. Or is unlimited
  // 3. Or was redeemed on a recurring frequency (hourly, daily, weekly, monthly) and cooldown has reached 0
  const canRedeem =
    !isRedeemed ||
    isUnlimited ||
    (!isOneTime && isRedeemed && secondsLeft === 0);

  return {
    isCooldownActive,
    canRedeem,
    secondsLeft,
    formattedCountdown: formatCountdown(secondsLeft),
  };
}
