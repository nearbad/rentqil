import { config } from '../config';

export interface EmailProvider {
  send(to: string, subject: string, text: string): Promise<void>;
}

// dev and test provider, the message just goes to stdout
export class MockEmail implements EmailProvider {
  async send(to: string, subject: string, text: string): Promise<void> {
    console.log(`[email:mock] to=${to} subject="${subject}" text="${text}"`);
  }
}

// smtp skeleton, wire nodemailer here once real credentials exist
export class SmtpEmail implements EmailProvider {
  async send(_to: string, _subject: string, _text: string): Promise<void> {
    // TODO add nodemailer, transport from config.smtp, remember SPF and DKIM
    // records on the sending domain or the codes will land in spam
    if (!config.smtp.host || !config.smtp.user) {
      throw new Error('smtp credentials are not configured');
    }
    throw new Error('smtp provider is not implemented yet');
  }
}

export function createEmailProvider(): EmailProvider {
  if (config.emailProvider === 'smtp') return new SmtpEmail();
  return new MockEmail();
}
