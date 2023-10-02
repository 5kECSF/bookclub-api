import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { emailRegex } from './entities/user.entity';
import { User, UserDocument } from './entities/user.entity';

import { MongoGenericRepository } from './imports.user';
import { FilterQuery, Model } from 'mongoose';
import { CreateUser } from './dto/user.mut.dto';
import { CryptoService } from '../../providers/crypto/crypto.service';
import { ChangePasswordInput } from '../auth/dto/auth.input.dto';
import { FAIL, Resp, Succeed } from '../../common/constants/return.consts';
import { ErrConst } from '../auth/dependencies.auth';

@Injectable()
export class UserService extends MongoGenericRepository<User> {
  constructor(
    private cryptoService: CryptoService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super(userModel);
  }

  public async createUser(createDto: CreateUser) {
    createDto.password = await this.cryptoService.createHash(createDto.password);
    return this.createOne(createDto);
  }

  public async findOneWithPwd(where: FilterQuery<User>): Promise<User> {
    // logTrace('findinguser=', where);
    const user: User = await this.userModel
      .findOne(where)
      .select('+password +verificationCodeHash +verificationCodeExpires +hashedRefreshToken')
      .lean();
    // logTrace('foundUser=', user);
    return user;
  }

  async anyUserExists(phoneOrEmail: string) {
    const isEmail = emailRegex.test(phoneOrEmail);
    let user: User | null;
    if (isEmail) {
      user = await this.findOneWithPwd({ email: phoneOrEmail });
    } else {
      user = await this.findOneWithPwd({ phone: phoneOrEmail });
    }
    if (!user) return null;
    return user;
  }

  async activeUserExists(phoneOrEmail: string) {
    const isEmail = emailRegex.test(phoneOrEmail);
    let user: User | null;
    if (isEmail) {
      user = await this.findOneWithPwd({ email: phoneOrEmail, active: true });
    } else {
      user = await this.findOneWithPwd({ phone: phoneOrEmail, active: true });
    }
    if (!user) return null;
    return user;
  }

  async changePassword(id: string, input: ChangePasswordInput): Promise<Resp<string>> {
    const { newPassword, oldPassword } = input;
    if (newPassword === oldPassword) return FAIL('Old password cant be same as new one', 400);
    const changePwdUser = await this.findOneWithPwd({ _id: id, active: true });
    if (!changePwdUser) return FAIL(ErrConst.USER_NOT_FOUND, 404);

    const pwdHashMatch = await this.cryptoService.verifyHash(changePwdUser.password, oldPassword);
    if (!pwdHashMatch) return FAIL('Password dont Match', 400);

    const newHash = await this.cryptoService.createHash(newPassword);
    const usr = await this.upsertOne(
      { _id: id },
      {
        password: newHash,
      },
    );
    if (!usr.ok) return FAIL('Failed to update Pwd', 500);

    return Succeed('Successfully changed password');
  }
}
