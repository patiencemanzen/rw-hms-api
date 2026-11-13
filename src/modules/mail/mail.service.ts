import { Inject, Injectable, Logger } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createTransport, type Transporter } from 'nodemailer';
import { mailConfig } from '../../config/mail.config';
import type { MailMessage } from './types/mail.types';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  constructor(@Inject(mailConfig.KEY) private readonly config: ConfigType<typeof mailConfig>) {
    this.transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      ...(config.user ? { auth: { user: config.user, pass: config.password } } : {}),
    });
    if (config.credentialsExpected && (!config.user || !config.password)) {
      this.logger.warn(
        'SMTP_USER/SMTP_PASSWORD are not set: password-reset emails will not be sent',
      );
    }
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({ from: this.config.from, ...message });
    this.logger.log({ subject: message.subject }, 'Email sent');
  }
}
