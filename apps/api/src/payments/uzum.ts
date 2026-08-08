import type { Payment } from '../lib/db';
import type { InitResult, PaymentProvider, RefundResult } from './provider';

// Uzum Bank / Uzum Nasiya adapter skeleton
// one class serves both kinds, nasiya is the same api with an
// installment flag on the order
//
// integration shape (uzum checkout):
// - create an order server side, get a checkout url, redirect the user
// - status callbacks arrive on our webhook with an hmac signature
// - nasiya (installments) orders carry the installment product type,
//   money still arrives to the merchant in full
//
// TODO request api access, put UZUM_MERCHANT_ID and UZUM_API_KEY into env
// TODO expose POST /webhooks/uzum with signature verification

export class UzumProvider implements PaymentProvider {
  constructor(private kind: 'uzum' | 'uzum_nasiya') {}

  async init(_payment: Payment): Promise<InitResult> {
    throw new Error(`${this.kind} adapter is not configured, mock mode should be active`);
  }

  async refund(_payment: Payment, _amountTiyin: number): Promise<RefundResult> {
    throw new Error(`${this.kind} adapter is not configured, mock mode should be active`);
  }
}
