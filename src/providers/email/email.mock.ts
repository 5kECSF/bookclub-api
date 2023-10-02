import { Injectable } from '@nestjs/common';
import { VerificationServiceInterface } from '../verification/verification.interface';
import { Resp } from '../../common/constants/return.consts';

@Injectable()
export class EmailMockService implements VerificationServiceInterface {
  sendEmailLinkConfirmation(email: string, token: string): Promise<void> {
    return Promise.resolve(undefined);
  }

  sendVerificationCode(to: string, code: string): Promise<Resp<any>> {
    // logTrace(
    //   '------------------------------',
    //   '--------------------',
    //   ColorEnums.BgWhite,
    // );
    // logTrace(
    //   '----------------------||||',
    //   '--------------------',
    //   ColorEnums.FgYellow,
    // );
    // logTrace('----------------------TO:', to, ColorEnums.FgYellow);
    // logTrace('----------------------Code :', code, ColorEnums.FgYellow);
    // logTrace(
    //   '-------------------------------=====',
    //   '--------------------',
    //   ColorEnums.FgYellow,
    // );
    // logTrace(
    //   '------------------------------',
    //   '--------------------',
    //   ColorEnums.BgWhite,
    // );
    return Promise.resolve(undefined);
  }
}
