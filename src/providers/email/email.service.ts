import { Injectable } from '@nestjs/common';
import { VerificationServiceInterface } from '../verification/verification.interface';
import { ColorEnums, logTrace } from '../../common/logger';
import * as hbs from 'nodemailer-express-handlebars';
import * as nodemailer from 'nodemailer';

import { google } from 'googleapis';
import * as path from 'path';
import { FAIL, Resp, Succeed } from '../../common/constants/return.consts';
import { EnvVar } from '../../common/config/config.instances';

const OAuth2 = google.auth.OAuth2;
const OAuth2_client = new OAuth2(
  EnvVar.getInstance.GOOGLE_CLIENT_ID,
  EnvVar.getInstance.GOOGLE_CLIENT_SECRET,
);
OAuth2_client.setCredentials({ refresh_token: EnvVar.getInstance.GOOGLE_GMAIL_REFRESH_TOKEN });

@Injectable()
export class EmailService implements VerificationServiceInterface {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor() {
    this.from = `5kilo Fellowship BookClub <${process.env.EMAIL_FROM}>`;
    this.createAppPwdTransport();
  }

  static getInstance() {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  createAppPwdTransport() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: EnvVar.getInstance.EMAIL_FROM,
        pass: EnvVar.getInstance.GMAIL_APP_PWD,
      },
    });
  }

  async createOAuthTransport() {
    //FIXME
    /**
     * this transporter need to be called every time in order to get the access token
     */
    const accessToken = await OAuth2_client.getAccessToken();

    return nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        type: 'OAuth2',
        user: EnvVar.getInstance.EMAIL_FROM,
        clientId: EnvVar.getInstance.GOOGLE_CLIENT_ID,
        clientSecret: EnvVar.getInstance.GOOGLE_CLIENT_SECRET,
        refreshToken: EnvVar.getInstance.GOOGLE_GMAIL_REFRESH_TOKEN,
        accessToken: accessToken.token,
        // expires: 1484314697598,
      },
    });
  }

  /**
   * this sends email,
   */
  async send(templateName, subject, to, context) {
    try {
      // const html = '';
      // 2) Define email options
      const mailOptions = {
        from: this.from,
        to,
        subject,
        template: templateName,
        context,
        // text: htmlToText.fromString(html),
      };
      //TODO the second one looks better since it dont need to be initialized every time
      // const transporter = await this.createOAuthTransport();
      const transporter = this.transporter;

      const hbsOptions = {
        viewEngine: {
          extName: '.hbs',
          partialsDir: path.join(__dirname, './templates/'),
          layoutsDir: path.join(__dirname, './templates/'),
          defaultLayout: '',
        },
        viewPath: path.join(__dirname, './templates/'),
      };
      transporter.use('compile', hbs(hbsOptions));

      return transporter.sendMail(mailOptions);
    } catch (e) {
      logTrace('', e.message, ColorEnums.BgRed);
      throw e;
    }
  }

  sendEmailLinkConfirmation(email: string, token: string): Promise<void> {
    return Promise.resolve(undefined);
  }

  /**
   * @returns Promise<Resp<any>> with success if the operation is success   *
   * @param email   email of the user email to be sent
   * @param token  the verification code sent
   * @example
   * Prints "true" for `{@link}` but "false" for `@internal`:
   * ```ts
   * ```
   */
  async sendVerificationCode(email: string, token: string): Promise<Resp<any>> {
    try {
      logTrace('sending email', email);
      const message = await this.send('confirmation', 'Confirm to activate your account', email, {
        code: token,
      });
      logTrace('email response', message);

      return Succeed(message);
    } catch (e) {
      logTrace('email sending error', e.message);
      return FAIL(e.message);
    }
  }
}
