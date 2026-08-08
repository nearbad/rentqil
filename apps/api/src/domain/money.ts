// pure money math, everything is integer tiyin
// covered by unit tests, keep side effects out of here

export interface QuoteInput {
  slotPricesTiyin: number[];
  // percent of the price charged on top as the platform fee, 0 disables
  serviceFeePercent: number;
  // promo discount, already capped by the caller or capped here
  discountTiyin?: number;
}

export interface Quote {
  // price of the slots before any discount
  totalTiyin: number;
  discountTiyin: number;
  // what the player actually pays for the court, total minus discount
  netTiyin: number;
  serviceFeeTiyin: number;
  payNowTiyin: number;
}

// the whole price is paid online up front, plus the service fee.
// the fee is charged on the discounted price
export function quoteBooking(input: QuoteInput): Quote {
  const totalTiyin = input.slotPricesTiyin.reduce((sum, p) => sum + p, 0);
  const discountTiyin = Math.min(Math.max(input.discountTiyin ?? 0, 0), totalTiyin);
  const netTiyin = totalTiyin - discountTiyin;
  const serviceFeeTiyin = Math.round((netTiyin * Math.max(input.serviceFeePercent, 0)) / 100);
  return {
    totalTiyin,
    discountTiyin,
    netTiyin,
    serviceFeeTiyin,
    payNowTiyin: netTiyin + serviceFeeTiyin,
  };
}

export interface PromoLike {
  percentOff: number | null;
  amountOffTiyin: number | null;
}

// discount for a promo against a base price, rounded to whole soms,
// never larger than the price itself
export function promoDiscount(promo: PromoLike, baseTiyin: number): number {
  let discount = 0;
  if (promo.percentOff) {
    discount = Math.round((baseTiyin * promo.percentOff) / 100 / 100) * 100;
  } else if (promo.amountOffTiyin) {
    discount = promo.amountOffTiyin;
  }
  return Math.min(Math.max(discount, 0), baseTiyin);
}

export { splitEven } from '@rentqil/shared';

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

// player initiated cancellation of a confirmed booking.
// the service fee never comes back, so the refund base is the price only:
// inside the free window the full price returns, a late cancellation
// returns the policy percent of the price
export function refundForCancellation(args: {
  policy: RefundPolicyInput;
  hoursToStart: number;
  totalTiyin: number;
  paidTiyin: number;
}): RefundQuote {
  const { policy, hoursToStart, totalTiyin, paidTiyin } = args;
  if (paidTiyin <= 0) return { refundTiyin: 0, reason: 'nothing_paid' };
  if (!policy.refundEnabled) return { refundTiyin: 0, reason: 'no_refund' };

  if (hoursToStart >= policy.freeCancelHours) {
    return { refundTiyin: Math.min(paidTiyin, totalTiyin), reason: 'free_window' };
  }
  const late = Math.round((totalTiyin * policy.lateRefundPercent) / 100);
  return { refundTiyin: Math.min(late, paidTiyin), reason: 'late' };
}
