/**
 * True-cost panel — "what you'll actually pay".
 *
 * estimatedMonthlyTotal is the authoritative server figure and already includes
 * the deposit amortized over 12 months. The client never recomputes the total;
 * it only explains the assumption in plain language.
 */
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '@/theme';
import { CostBreakdown as CostBreakdownType } from '@/utils/types';
import { formatPkr } from '@/utils/format';

interface CostBreakdownProps {
  cost: CostBreakdownType;
  /** Listing priceType — yearly rent is converted for display clarity. */
  rentPeriodLabel?: 'monthly' | 'yearly';
  /** Deposit amortization window used by the API (default 12). */
  amortizationMonths?: number;
}

export function CostBreakdown({
  cost,
  rentPeriodLabel = 'monthly',
  amortizationMonths = 12,
}: CostBreakdownProps) {
  const depositTotal = Math.round(cost.rent * cost.depositMonths);
  const amortizedDeposit = Math.round((cost.rent * cost.depositMonths) / amortizationMonths);
  const monthlyRent =
    rentPeriodLabel === 'yearly' ? Math.round(cost.rent / 12) : Math.round(cost.rent);

  return (
    <View>
      <Text style={styles.heading}>What you&apos;ll actually pay</Text>

      {rentPeriodLabel === 'yearly' ? (
        <Row k="Rent (yearly)" v={formatPkr(cost.rent)} />
      ) : (
        <Row k="Rent (monthly)" v={formatPkr(monthlyRent)} />
      )}
      {rentPeriodLabel === 'yearly' ? (
        <Row k="Rent (monthly equiv.)" v={formatPkr(monthlyRent)} />
      ) : null}

      {cost.depositMonths > 0 ? (
        <Row
          k={`Deposit (÷ ${amortizationMonths} mo)`}
          v={formatPkr(amortizedDeposit)}
        />
      ) : null}

      {cost.monthlyMaintenance > 0 ? (
        <Row k="Maintenance" v={formatPkr(cost.monthlyMaintenance)} />
      ) : (
        <Row k="Maintenance" v="None" muted />
      )}
      {cost.estimatedUtilities > 0 ? (
        <Row k="Utilities (est.)" v={formatPkr(cost.estimatedUtilities)} />
      ) : (
        <Row k="Utilities (est.)" v="None" muted />
      )}

      <View style={styles.total}>
        <Text style={styles.totalKey}>True monthly</Text>
        <Text style={styles.totalValue}>{formatPkr(cost.estimatedMonthlyTotal)}</Text>
      </View>

      {cost.depositMonths > 0 ? (
        <Text style={styles.note}>
          Security deposit {formatPkr(depositTotal)} ({cost.depositMonths}{' '}
          {cost.depositMonths === 1 ? 'month' : 'months'} of rent, typically refundable) is spread
          across {amortizationMonths} months in this estimate — it is not charged every month.
        </Text>
      ) : (
        <Text style={styles.note}>No security deposit required on this listing.</Text>
      )}
    </View>
  );
}

function Row({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowKey}>{k}</Text>
      <Text style={[styles.rowValue, muted && styles.rowMuted]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.bodyStrong, color: colors.textPrimary, marginBottom: spacing.xs },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingVertical: spacing.sm + 1,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  rowKey: { ...typography.body, color: colors.textSecondary, flex: 1, paddingRight: spacing.md },
  rowValue: { ...typography.body, color: colors.textPrimary, fontWeight: '500' },
  rowMuted: { color: colors.textDisabled, fontWeight: '400' },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: spacing.md,
  },
  totalKey: { ...typography.body, color: colors.textPrimary, fontWeight: '600' },
  totalValue: { ...typography.subheading, color: colors.textPrimary, fontWeight: '700' },
  note: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm, lineHeight: 18 },
});
