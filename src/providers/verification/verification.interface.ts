import { Resp } from '../../common/constants/response.const';

export interface VerificationServiceInterface {
  sendVerificationCode(to: string, code: string): Promise<Resp<any>>;

  sendEmailLinkConfirmation(email: string, token: string): Promise<void>;
}
