type MailMessage = {
  to: string;
  subject: string;
  text: string;
};

export interface Mailer {
  readonly kind: "noop" | "smtp";
  send(message: MailMessage): Promise<void>;
}

class NoopMailer implements Mailer {
  readonly kind = "noop" as const;
  private sentMessages: MailMessage[] = [];
  async send(message: MailMessage): Promise<void> {
    this.sentMessages.push(message);
    console.warn(`[mailer:noop] would send mail to=${message.to} subject="${message.subject}"`);
  }
  get sent(): readonly MailMessage[] {
    return this.sentMessages;
  }
}

class SmtpMailer implements Mailer {
  readonly kind = "smtp" as const;
  private transporterPromise: Promise<import("nodemailer").Transporter> | null = null;
  constructor(
    private config: {
      host: string;
      port: number;
      user: string;
      pass: string;
      from: string;
    }
  ) {}

  private async getTransporter() {
    if (!this.transporterPromise) {
      this.transporterPromise = import("nodemailer").then((mod) =>
        mod.createTransport({
          host: this.config.host,
          port: this.config.port,
          secure: this.config.port === 465,
          auth: this.config.user
            ? { user: this.config.user, pass: this.config.pass }
            : undefined
        })
      );
    }
    return this.transporterPromise;
  }

  async send(message: MailMessage): Promise<void> {
    const transporter = await this.getTransporter();
    await transporter.sendMail({
      from: this.config.from,
      to: message.to,
      subject: message.subject,
      text: message.text
    });
  }
}

let instance: Mailer | null = null;

export function getMailer(): Mailer {
  if (instance) return instance;
  const host = process.env.SMTP_HOST ?? "";
  if (!host) {
    instance = new NoopMailer();
    return instance;
  }
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER ?? "";
  const pass = process.env.SMTP_PASS ?? "";
  const from = process.env.SMTP_USER || process.env.ADMIN_EMAIL || "noreply@local";
  instance = new SmtpMailer({ host, port, user, pass, from });
  return instance;
}

export function __setMailerForTests(mailer: Mailer | null): void {
  instance = mailer;
}

export function getAdminEmail(): string {
  return process.env.ADMIN_EMAIL ?? "";
}

export type { MailMessage };
