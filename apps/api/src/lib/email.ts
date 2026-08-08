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

// resend.com http api, free tier is enough for login codes and reminders.
// the sending domain must be verified in resend (spf + dkim dns records)
export class ResendEmail implements EmailProvider {
  async send(to: string, subject: string, text: string): Promise<void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${config.resendApiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ from: config.emailFrom, to: [to], subject, text }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`resend failed: ${res.status} ${body.slice(0, 200)}`);
    }
  }
}

// smtp skeleton, wire nodemailer here if resend ever stops fitting
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
  if (config.emailProvider === 'resend') return new ResendEmail();
  if (config.emailProvider === 'smtp') return new SmtpEmail();
  return new MockEmail();
}
