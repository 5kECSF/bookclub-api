import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { emailRegex, User, UserDocument } from './entities/user.entity';

import { FAIL, Resp, Succeed } from '@/common/constants/return.consts';
import { logTrace } from '@/common/logger';
import { CryptoService } from '@/providers/crypto/crypto.service';
import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import { FilterQuery, Model } from 'mongoose';
import { CreateUserDto } from './entities/user.dto';

@Injectable()
export class UserService extends MongoGenericRepository<User> {
  constructor(
    private cryptoService: CryptoService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super(userModel);
  }

  public async createUser(createDto: CreateUserDto) {
    createDto.password = await this.cryptoService.createHash(createDto.password);
    return this.createOne(createDto);
  }

  public async findOneWithPwd(where: FilterQuery<User>): Promise<User> {
    try {
      const user: User = await this.userModel
        .findOne(where)
        .select('+password +verificationCodeHash +verificationCodeExpires +hashedRefreshToken')
        .lean();

      return user;
    } catch (e) {
      logTrace('failed to find user=', e.message);
      return null;
    }
    // logTrace('findinguser=', where);
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

  //admin operations
  async resetPwd(userId: string, pwd: string): Promise<Resp<string>> {
    const newHash = await this.cryptoService.createHash(pwd);
    const usr = await this.upsertOne(
      { _id: userId },
      {
        password: newHash,
      },
    );
    if (!usr.ok) return FAIL('Failed to update Pwd', 500);
    return Succeed(pwd);
  }
}
