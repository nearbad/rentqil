import type { Payment } from '../lib/db';
import type { InitResult, PaymentProvider, RefundResult } from './provider';

// Click adapter skeleton
// docs: https://docs.click.uz/click-api/
//
// integration shape:
// - redirect the user to https://my.click.uz/services/pay
//   ?service_id=...&merchant_id=...&amount=SOM&transaction_param=<paymentId>
//   note click wants amounts in som with decimals, ours are tiyin, divide by 100
// - click calls our endpoints twice: action=0 (prepare) and action=1 (complete)
// - each call is signed: sign_string = md5(click_trans_id + service_id +
//   SECRET_KEY + merchant_trans_id + [merchant_prepare_id +] amount + action +
//   sign_time)
//
// TODO get SERVICE_ID, MERCHANT_ID, SECRET_KEY from the click cabinet
// TODO expose POST /webhooks/click handling prepare/complete with sign checks
// TODO refunds go through the click merchant cabinet api (reversal)

export class ClickProvider implements PaymentProvider {
  async init(_payment: Payment): Promise<InitResult> {
    throw new Error('click adapter is not configured, mock mode should be active');
  }

  async refund(_payment: Payment, _amountTiyin: number): Promise<RefundResult> {
    throw new Error('click adapter is not configured, mock mode should be active');
  }
}
