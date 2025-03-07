import { ErrConst } from '@/common/constants';
import { FAIL, Resp, Succeed } from '@/common/constants/return.consts';
import { CryptoService } from '@/providers/crypto/crypto.service';
import { Injectable } from '@nestjs/common';
import { UserService } from '../users';
import { ChangePasswordInput } from './dto/profile.dto';

@Injectable()
export class ProfileService {
  constructor(private cryptoService: CryptoService, private usersService: UserService) {}

  async changePassword(id: string, input: ChangePasswordInput): Promise<Resp<string>> {
    const { newPassword, oldPassword } = input;
    if (newPassword === oldPassword) return FAIL('Old password cant be same as new one', 400);
    const changePwdUser = await this.usersService.findOneWithPwd({ _id: id, active: true });
    if (!changePwdUser) return FAIL(ErrConst.USER_NOT_FOUND, 404);

    const pwdHashMatch = await this.cryptoService.verifyHash(changePwdUser.password, oldPassword);
    if (!pwdHashMatch) return FAIL('Password dont Match', 400);

    const newHash = await this.cryptoService.createHash(newPassword);
    const usr = await this.usersService.upsertOne(
      { _id: id },
      {
        password: newHash,
      },
    );
    if (!usr.ok) return FAIL('Failed to update Pwd', 500);

    return Succeed('Successfully changed password');
  }
}
