import type { Payment } from '../lib/db';
import type { InitResult, PaymentProvider, RefundResult } from './provider';

// Paynet adapter skeleton
//
// paynet works through their agent network and app, the merchant side is a
// SOAP/xml gateway (PerformTransaction, CheckTransaction, CancelTransaction,
// GetInformation) that we host and paynet calls
//
// TODO sign the agreement, get the service id and allowed ip ranges
// TODO expose the xml endpoint at /webhooks/paynet with ip allowlist
// TODO GetInformation should return the booking summary for the given id

export class PaynetProvider implements PaymentProvider {
  async init(_payment: Payment): Promise<InitResult> {
    throw new Error('paynet adapter is not configured, mock mode should be active');
  }

  async refund(_payment: Payment, _amountTiyin: number): Promise<RefundResult> {
    throw new Error('paynet adapter is not configured, mock mode should be active');
  }
}
