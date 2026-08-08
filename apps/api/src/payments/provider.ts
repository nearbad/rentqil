import type { Payment, PaymentProviderKind } from '../lib/db';

// one interface for every psp, the booking flow never talks to a
// concrete provider directly

export interface InitResult {
  payUrl: string;
  externalId?: string;
}

export interface RefundResult {
  ok: boolean;
  externalId?: string;
}

export interface PaymentProvider {
  // creates whatever the psp needs and returns the redirect url
  init(payment: Payment): Promise<InitResult>;
  // full or partial refund of a paid payment
  refund(payment: Payment, amountTiyin: number): Promise<RefundResult>;
}

import { MockProvider } from './mock';
import { ClickProvider } from './click';
import { PaymeProvider } from './payme';
import { UzumProvider } from './uzum';
import { PaynetProvider } from './paynet';

const mock = new MockProvider();

// real adapters exist as skeletons, everything routes through the mock
// until we sign contracts and get credentials, see docs/DECISIONS.md 12
const USE_MOCK = true;

const real: Record<PaymentProviderKind, PaymentProvider> = {
  click: new ClickProvider(),
  payme: new PaymeProvider(),
  uzum: new UzumProvider('uzum'),
  uzum_nasiya: new UzumProvider('uzum_nasiya'),
  paynet: new PaynetProvider(),
};

export function providerFor(kind: PaymentProviderKind): PaymentProvider {
  if (USE_MOCK) return mock;
  return real[kind];
}
