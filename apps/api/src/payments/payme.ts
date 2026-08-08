import type { Payment } from '../lib/db';
import type { InitResult, PaymentProvider, RefundResult } from './provider';

// Payme Merchant API adapter skeleton
// docs: https://developer.help.paycom.uz/protokol-merchant-api/
//
// integration shape:
// - checkout url is https://checkout.paycom.uz/<base64(m=MERCHANT_ID;ac.booking_id=...;a=AMOUNT_TIYIN)>
// - payme then calls our JSON-RPC endpoint with these methods:
//   CheckPerformTransaction, CreateTransaction, PerformTransaction,
//   CancelTransaction, CheckTransaction, GetStatement
// - requests are authorized with basic auth, password is the merchant key
// - amounts are already in tiyin which matches our storage
//
// TODO sign the merchant contract, put PAYME_MERCHANT_ID and PAYME_KEY into env
// TODO expose POST /webhooks/payme implementing the JSON-RPC methods above
// TODO map PerformTransaction -> applyPaymentResult(paymentId, 'paid', txId)

export class PaymeProvider implements PaymentProvider {
  async init(_payment: Payment): Promise<InitResult> {
    throw new Error('payme adapter is not configured, mock mode should be active');
  }

  async refund(_payment: Payment, _amountTiyin: number): Promise<RefundResult> {
    // payme side refunds happen through CancelTransaction initiated by us
    throw new Error('payme adapter is not configured, mock mode should be active');
  }
}
