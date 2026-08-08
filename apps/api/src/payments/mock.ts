import { createHmac, randomUUID } from 'node:crypto';
import type { Payment } from '../lib/db';
import type { InitResult, PaymentProvider, RefundResult } from './provider';
import { config } from '../config';

// fake psp for development and testing
// the pay page lives in the web app, its buttons hit /payments/mock/:id/simulate
// which calls simulateOutcome below, and that sends a signed webhook over real
// http to our own /webhooks/mock, so the whole confirm path works like with a
// real provider

export function mockSignature(paymentId: string, outcome: string): string {
  return createHmac('sha256', config.mockWebhookSecret).update(`${paymentId}:${outcome}`).digest('hex');
}

export class MockProvider implements PaymentProvider {
  async init(payment: Payment): Promise<InitResult> {
    return {
      payUrl: `${config.webUrl}/pay/${payment.id}`,
      externalId: `mock_${randomUUID()}`,
    };
  }

  async refund(_payment: Payment, _amountTiyin: number): Promise<RefundResult> {
    // instant success in mock mode
    return { ok: true, externalId: `mock_refund_${randomUUID()}` };
  }

  async simulateOutcome(paymentId: string, outcome: 'paid' | 'failed'): Promise<void> {
    const body = {
      paymentId,
      outcome,
      txId: `mocktx_${randomUUID()}`,
      sig: mockSignature(paymentId, outcome),
    };
    const res = await fetch(`${config.apiUrl}/webhooks/mock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`mock webhook delivery failed: ${res.status}`);
    }
  }
}
