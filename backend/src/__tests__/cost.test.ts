import { computeCostBreakdown } from '@/services/cost';

describe('computeCostBreakdown', () => {
  it('amortizes the deposit over the window and sums the monthly total', () => {
    // rent 38000, 2mo deposit over 12mo = 6333.33; + 2500 maint + 6500 utils
    const result = computeCostBreakdown(
      { rent: 38000, depositMonths: 2, monthlyMaintenance: 2500, estimatedUtilities: 6500 },
      12,
    );
    expect(result.estimatedMonthlyTotal).toBe(53333); // 38000 + 6333.33 + 2500 + 6500 rounded
  });

  it('handles no deposit', () => {
    const result = computeCostBreakdown(
      { rent: 20000, depositMonths: 0, monthlyMaintenance: 1000, estimatedUtilities: 3000 },
      12,
    );
    expect(result.estimatedMonthlyTotal).toBe(24000);
  });

  it('clamps negative inputs to zero', () => {
    const result = computeCostBreakdown(
      { rent: -5000, depositMonths: -1, monthlyMaintenance: -100, estimatedUtilities: -200 },
      12,
    );
    expect(result).toMatchObject({
      rent: 0,
      depositMonths: 0,
      monthlyMaintenance: 0,
      estimatedUtilities: 0,
      estimatedMonthlyTotal: 0,
    });
  });

  it('treats a zero/negative amortization window as one month (deposit not divided away)', () => {
    const result = computeCostBreakdown(
      { rent: 10000, depositMonths: 1, monthlyMaintenance: 0, estimatedUtilities: 0 },
      0,
    );
    expect(result.estimatedMonthlyTotal).toBe(20000); // 10000 rent + 10000 deposit / 1
  });

  it('rounds large PKR totals to whole rupees', () => {
    const result = computeCostBreakdown(
      { rent: 250000, depositMonths: 3, monthlyMaintenance: 15000, estimatedUtilities: 22000 },
      12,
    );
    // 250000 + (750000/12) + 15000 + 22000 = 250000 + 62500 + 37000 = 349500
    expect(result.estimatedMonthlyTotal).toBe(349500);
  });
});
