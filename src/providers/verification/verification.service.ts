import { Injectable, Logger } from '@nestjs/common';
import { EnvVar } from '../../common/config/config.instances';
import { FAIL, Resp, Succeed } from '../../common/constants/return.consts';
import { VerificationServiceInterface } from './verification.interface';

/** how long we wait for the email provider before giving up (registration must never hang) */
const EMAIL_TIMEOUT_MS = 15_000;

/**
 * Sends verification codes.
 * - EMAIL_PROVIDER=console, or no GMAIL_APP_PWD configured -> the code is logged to the console
 * - otherwise the gmail EmailService is used; failures/timeouts are logged and never thrown
 */
@Injectable()
export class VerificationService implements VerificationServiceInterface {
  private readonly logger = new Logger('Verification');
  private emailService: VerificationServiceInterface | null = null;

  get useConsole(): boolean {
    const env = EnvVar.getInstance;
    return env.EMAIL_PROVIDER?.toLowerCase() === 'console' || !env.GMAIL_APP_PWD;
  }

  private getEmailService(): VerificationServiceInterface {
    if (!this.emailService) {
      // lazy require: googleapis/nodemailer are only loaded when email is really used
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { EmailService } = require('../email/email.service');
      this.emailService = new EmailService();
    }
    return this.emailService;
  }

  async sendVerificationCode(to: string, code: string): Promise<Resp<any>> {
    if (this.useConsole) {
      this.logger.log(`[console email] verification code for ${to}: ${code}`);
      return Succeed(true);
    }
    try {
      let timer: NodeJS.Timeout;
      const timeout = new Promise<Resp<any>>((resolve) => {
        timer = setTimeout(
          () => resolve(FAIL(`email sending timed out after ${EMAIL_TIMEOUT_MS}ms`, 504)),
          EMAIL_TIMEOUT_MS,
        );
      });
      const result = await Promise.race([
        this.getEmailService().sendVerificationCode(to, code),
        timeout,
      ]);
      clearTimeout(timer);
      if (!result?.ok) this.logger.error(`failed to email code to ${to}: ${result?.errMessage}`);
      return result;
    } catch (e) {
      this.logger.error(`failed to email code to ${to}: ${e?.message}`);
      return FAIL(e?.message || 'email failed', 500);
    }
  }

  sendEmailLinkConfirmation(): Promise<void> {
    return Promise.resolve(undefined);
  }
}
