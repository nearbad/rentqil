// pure money math, everything is integer tiyin
// covered by unit tests, keep side effects out of here

export interface QuoteInput {
  slotPricesTiyin: number[];
  depositPercent: number;
  serviceFeeEnabled: boolean;
  serviceFeeTiyin: number;
}

export interface Quote {
  totalTiyin: number;
  depositPercent: number;
  depositTiyin: number;
  serviceFeeTiyin: number;
  payNowTiyin: number;
  payAtVenueTiyin: number;
}

export function quoteBooking(input: QuoteInput): Quote {
  const totalTiyin = input.slotPricesTiyin.reduce((sum, p) => sum + p, 0);
  const depositTiyin = Math.round((totalTiyin * input.depositPercent) / 100);
  const serviceFeeTiyin = input.serviceFeeEnabled ? input.serviceFeeTiyin : 0;
  return {
    totalTiyin,
    depositPercent: input.depositPercent,
    depositTiyin,
    serviceFeeTiyin,
    payNowTiyin: depositTiyin + serviceFeeTiyin,
    payAtVenueTiyin: totalTiyin - depositTiyin,
  };
}

// split an amount into n parts that sum exactly to the amount,
// first parts pick up the remainder tiyin
export function splitEven(amountTiyin: number, parts: number): number[] {
  if (parts < 1) throw new Error('parts must be >= 1');
  if (amountTiyin < 0) throw new Error('amount must be >= 0');
  const base = Math.floor(amountTiyin / parts);
  const remainder = amountTiyin - base * parts;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? 1 : 0));
}

// commission is taken from the money the platform actually holds,
// so it is a percent of the full price capped by the deposit
export function commissionFor(
  totalTiyin: number,
  depositTiyin: number,
  percent: number,
  enabled: boolean
): number {
  if (!enabled || percent <= 0) return 0;
  const raw = Math.round((totalTiyin * percent) / 100);
  return Math.min(raw, depositTiyin);
}

// distribute a refund total across paid payments proportionally,
// result sums exactly to refundTiyin and never exceeds any single payment
export function allocateProportional(refundTiyin: number, paymentAmounts: number[]): number[] {
  const paidTotal = paymentAmounts.reduce((s, a) => s + a, 0);
  if (refundTiyin > paidTotal) throw new Error('refund exceeds paid total');
  if (paidTotal === 0 || refundTiyin === 0) return paymentAmounts.map(() => 0);

  const exact = paymentAmounts.map((a) => (refundTiyin * a) / paidTotal);
  const floors = exact.map(Math.floor);
  let left = refundTiyin - floors.reduce((s, f) => s + f, 0);

  // hand out the remainder to the largest fractional parts
  const order = exact
    .map((v, i) => ({ frac: v - Math.floor(v), i }))
    .sort((a, b) => b.frac - a.frac);
  const result = [...floors];
  for (const { i } of order) {
    if (left <= 0) break;
    const cur = result[i] ?? 0;
    if (cur < (paymentAmounts[i] ?? 0)) {
      result[i] = cur + 1;
      left--;
    }
  }
  return result;
}

export interface RefundPolicyInput {
  refundEnabled: boolean;
  freeCancelHours: number;
  lateRefundPercent: number;
}

export interface RefundQuote {
  refundTiyin: number;
  reason: 'free_window' | 'late' | 'no_refund' | 'nothing_paid';
}

// player initiated cancellation
// inside the free window everything paid online comes back,
// late cancellation returns a percent of the deposit only, the service fee stays
export function refundForCancellation(args: {
  policy: RefundPolicyInput;
  hoursToStart: number;
  depositTiyin: number;
  serviceFeeTiyin: number;
  paidTiyin: number;
}): RefundQuote {
  const { policy, hoursToStart, depositTiyin, serviceFeeTiyin, paidTiyin } = args;
  if (paidTiyin <= 0) return { refundTiyin: 0, reason: 'nothing_paid' };
  if (!policy.refundEnabled) return { refundTiyin: 0, reason: 'no_refund' };

  if (hoursToStart >= policy.freeCancelHours) {
    return { refundTiyin: Math.min(paidTiyin, depositTiyin + serviceFeeTiyin), reason: 'free_window' };
  }
  const late = Math.round((depositTiyin * policy.lateRefundPercent) / 100);
  return { refundTiyin: Math.min(late, paidTiyin), reason: 'late' };
}
