import { config } from '../config';

export interface SmsProvider {
  send(phone: string, text: string): Promise<void>;
}

// dev and test provider, the code just goes to stdout
export class MockSms implements SmsProvider {
  async send(phone: string, text: string): Promise<void> {
    console.log(`[sms:mock] to=${phone} text="${text}"`);
  }
}

// eskiz.uz is the usual SMS gateway in Uzbekistan
// skeleton only, we have no account yet
export class EskizSms implements SmsProvider {
  private token: string | null = null;

  async send(phone: string, text: string): Promise<void> {
    // TODO get credentials, then:
    // 1. POST https://notify.eskiz.uz/api/auth/login { email, password } -> token
    //    cache the token, it lives ~30 days, refresh on 401
    // 2. POST https://notify.eskiz.uz/api/message/sms/send
    //    { mobile_phone: phone without +, message: text, from: '4546' }
    // 3. sender name and message templates must be approved by eskiz first
    if (!config.eskiz.email || !config.eskiz.password) {
      throw new Error('eskiz credentials are not configured');
    }
    throw new Error('eskiz provider is not implemented yet');
  }
}

export function createSmsProvider(): SmsProvider {
  if (config.smsProvider === 'eskiz') return new EskizSms();
  return new MockSms();
}
