import { Resp } from '../../common/constants/return.consts';

export interface VerificationServiceInterface {
  sendVerificationCode(to: string, code: string): Promise<Resp<any>>;

  sendEmailLinkConfirmation(email: string, token: string): Promise<void>;
}
