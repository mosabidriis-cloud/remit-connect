/**
 * Business Rule
 * ----------------------------------------------------
 * Every 15,000,000 SDG of branch liquidity equals
 * one available account capacity.
 */

export const ACCOUNT_CAPACITY = 15_000_000;

/**
 * Returns available account capacity.
 *
 * Example:
 * 22,500,000 => 1.50
 * 43,500,000 => 2.90
 */
export function calculateAvailableAccounts(
  liquidity: number
): number {
  if (!Number.isFinite(liquidity) || liquidity <= 0) {
    return 0;
  }

  return Number(
    (liquidity / ACCOUNT_CAPACITY).toFixed(2)
  );
}