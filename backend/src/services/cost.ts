/**
 * True-cost computation — Estate Ease's "what you'll actually pay" figure. Pure
 * and unit-tested. The refundable deposit is amortized over a configurable window
 * (default 12 months) rather than dumped into month one, so the monthly estimate
 * stays honest (Technical Docs §3.2 / DESIGN.md true-cost principle).
 *
 *   estimatedMonthlyTotal =
 *     rent
 *     + (rent * depositMonths) / amortizationMonths
 *     + monthlyMaintenance
 *     + estimatedUtilities
 */
import { config } from '@/config/env';
import { CostBreakdown, CostInput } from '@/utils/types';

export function computeCostBreakdown(
  input: CostInput,
  amortizationMonths: number = config.cost.depositAmortizationMonths,
): CostBreakdown {
  const rent = Math.max(0, input.rent);
  const depositMonths = Math.max(0, input.depositMonths);
  const monthlyMaintenance = Math.max(0, input.monthlyMaintenance);
  const estimatedUtilities = Math.max(0, input.estimatedUtilities);
  const months = amortizationMonths > 0 ? amortizationMonths : 1;

  const amortizedDeposit = (rent * depositMonths) / months;
  const estimatedMonthlyTotal = Math.round(
    rent + amortizedDeposit + monthlyMaintenance + estimatedUtilities,
  );

  return { rent, depositMonths, monthlyMaintenance, estimatedUtilities, estimatedMonthlyTotal };
}
