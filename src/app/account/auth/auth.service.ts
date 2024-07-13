import { Injectable } from '@nestjs/common';
// import { Request } from 'express';

//- users
import { UserFromToken } from '@/common/common.types.dto';
import { logTrace } from '@/common/logger';
import { CustomJwtService } from '@/providers/crypto/jwt.service';
import { ErrConst } from '../../../common/constants';
import { VerificationService } from '../../../providers/verification';

import { removeKeys } from '@/common/util/util';
import { CryptoService } from '@/providers/crypto/crypto.service';
import { RegisterUserInput, User, UserRes, UserService } from '../users';

//--self
import { ResponseConsts } from '@/common/constants/response.consts';
import { FAIL, Resp, Succeed } from '@/common/constants/return.consts';
import { UpdateEmailInput } from '../users/dto/user.mut.dto';
import { LoginUserInput, ResetPasswordInput, VerifyCodeInput } from './dto/auth.input.dto';
import { AuthToken, AuthTokenResponse } from './dto/auth.response.dto';

import { SystemConst } from '@/common/constants/system.consts';
import { getExpiryDate } from '@/providers/crypto/token.functions';

export class UserAndTokne {
  usrToken: UserFromToken;
  user: User;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: CustomJwtService,
    private cryptoService: CryptoService,
    private verificationService: VerificationService, //TODO initialize ConfigTypes here
  ) {}

  /**
     *   AS-1.1:registerWithEmailCode - check user exist, - generate code & create user with that code, - send verification via email

     */
  public async registerWithEmailCode(input: RegisterUserInput): Promise<Resp<string>> {
    try {
      const user = await this.usersService.findOneWithPwd({
        email: input.email,
        // active: true,
      });

      //If the user exists
      if (user) {
        if (user.active) {
          // TODO: send a warning email/sms to users that some one is trying to log with their credintials
          return FAIL(ResponseConsts.USER_EXISTS);
        }
        // if user is not Verified yet and waiting for verification dont do any thing
        // TODO :make him wait some minutes before re assigning (verificationExpires > date.now + (VerExp - allowed Reset))
        /**
         * the email sending might have failed so go with the flow
         */
        // if (user.verificationCodeExpires > Date.now()) {
        //   return FAIL(RespConst.VERIFICATION_PENDING);
        // }
        // else {
        //   return FAIL(ErrConst.VERIFICATION_FAILED);
        // }
      }
      input.password = await this.cryptoService.createHash(input.password);
      return this.sendCodeAndUpdateHash(input.email, input);
    } catch (e) {
      return FAIL(e.message);
    }
  }

  /**
     AuS-1.1: sendCodeAndUpdateHash
     */
  async sendCodeAndUpdateHash(addressedEmail, input): Promise<Resp<string>> {
    /** ---  generate random code & update the verification hash */
    const code = '0000';
    // const code = this.cryptoService.randomCode();
    const codeHash = await this.cryptoService.createHash(code);

    /**
         save the hashed value of the Code and set its expire time now + 30 min
         */
    const usr = await this.usersService.upsertOne(
      { email: input.email },
      {
        ...input,
        verificationCodeHash: codeHash,
        verificationCodeExpires: Date.now() + SystemConst.VERIFICATION_CODE_EXP,
      },
    );

    if (!usr.ok || (usr.val.modifiedCount == 0 && usr.val.upsertedCount == 0)) {
      // logTrace('update op=', usr);
      return FAIL(ErrConst.COULD_NOT_CREATE_USER);
    }
    /**
     * send verification email
     */
    const emRes = await this.verificationService.sendVerificationCode(addressedEmail, code);

    return Succeed(ResponseConsts.VERIFICATION_SENT);
  }

  //===============  Verifying & activating user by code

  /**
     AuSr-2: - checks user exists, - check if the hash of codes matches & is not expired, - activates user
     */
  public async activateAccountByCode(phoneOrEmail: string, code: string): Promise<Resp<UserRes>> {
    /**
     * verify the code, user is not active
     */
    const verifyToActivate = await this.verifyCode(phoneOrEmail, code);
    if (!verifyToActivate) return FAIL(ErrConst.INVALID_CODE);
    if (verifyToActivate.active == true) return FAIL(ErrConst.USER_EXISTS);

    // TODO! FIXME !: depend on the project Phone Or email
    const updatedUser = await this.usersService.findOneAndUpdate(
      { email: phoneOrEmail },
      {
        active: true,
      },
    );
    if (!updatedUser.ok) return FAIL(updatedUser.errMessage, updatedUser.code);
    // await this.emailService.sendWelcome(newUser.email)
    return Succeed({ error: '', user: updatedUser.val });
  }

  /**
     Au.S-2.1
     */
  async verifyCode(phoneOrEmail: string, code: string): Promise<User> {
    //1. check that a user exists with this email or phone number
    const userToVerify = await this.usersService.anyUserExists(phoneOrEmail);
    if (!userToVerify) {
      logTrace('not found', code);
      return null;
    }
    const verificationCodeHashMatch = await this.cryptoService.verifyHash(
      userToVerify.verificationCodeHash,
      code,
    );
    if (!verificationCodeHashMatch || userToVerify.verificationCodeExpires < Date.now()) {
      logTrace('dont match', code);
      return null;
    }
    userToVerify.verificationCodeHash = '';
    userToVerify.password = '';
    return userToVerify;
  }

  /**
     AuSr-3
     */
  async login(input: LoginUserInput): Promise<Resp<AuthTokenResponse>> {
    // 3.1 validate user
    const user: User = await this.loginValidateUser(input);
    if (!user) return FAIL(ErrConst.INVALID_CREDENTIALS);

    const pickedUser = removeKeys(user, [
      'password',
      'hashedRefreshToken',
      'verificationCodeHash',
      'verificationCodeExpires',
    ]) as User;

    // 3.2: generate authentication Tokens
    const loginAuthToken: AuthToken = await this.generateAuthToken({
      _id: user._id,
      role: user.role,
    });
    if (!loginAuthToken) return FAIL(ErrConst.INTERNAL_ERROR);
    // 3.3: update users hashed token
    const loginUpdate = await this.updateHashedToken(user._id, loginAuthToken.refreshToken);
    if (!loginUpdate) return FAIL(ErrConst.INTERNAL_ERROR);

    return Succeed({ authToken: loginAuthToken, userData: pickedUser });
  }

  //Au.S-3.1
  async loginValidateUser(input: LoginUserInput): Promise<User> {
    const { info, password } = input;
    const userToLogin = await this.usersService.activeUserExists(info);
    logTrace('usr', userToLogin);
    if (!userToLogin) return null;
    logTrace('usere exis', userToLogin);
    // Check password hash
    const pwdHashMatch = await this.cryptoService.verifyHash(userToLogin.password, password);
    if (!pwdHashMatch) return null;
    userToLogin.password = '';
    userToLogin.verificationCodeHash = '';
    return userToLogin;
  }

  /**
   *   AuS-3.2:  generate access & refresh tokens: for [login & resetToken]
   */
  public async generateAuthToken(payload: UserFromToken, update = false): Promise<AuthToken> {
    /*
     * 1. create random session id When user first logins
     */
    const sessionId = this.cryptoService.randomCode();

    /*
     * 2. create a payload for the user, on resetTokens old session id is used
     */
    const newPayload: UserFromToken = {
      _id: payload._id,
      sessionId: update ? payload.sessionId : sessionId,
      role: payload.role,
    };
    /*
     * 3. generate refresh and access tokens
     */
    const accessToken = await this.jwtService.signAccessToken(newPayload);
    const refreshToken = await this.jwtService.signRefreshToken(newPayload);

    return {
      accessToken,
      refreshToken,
      sessionId: newPayload.sessionId,
      expiresIn: getExpiryDate(accessToken),
    };
  }

  /*
   * AuS-3.3: update users hashed token
   */
  async updateHashedToken(id, refreshToken) {
    const hashedRefreshToken = await this.cryptoService.createHash(refreshToken);
    //Update users hashed tokens: this is bad for half life tokens
    const usr = await this.usersService.upsertOne(
      { _id: id },
      {
        hashedRefreshToken,
      },
    );
    if (!usr.ok) return false;
    return usr.val.modifiedCount > 0;
  }

  // Au.S-4
  async logOut(token: string): Promise<Resp<boolean>> {
    try {
      const user = await this.getUserFromRefreshToken(token);
      if (!user.ok) return FAIL(user.errMessage);
      const userRes = await this.usersService.upsertOne(
        { _id: user.val.user._id },
        { hashedRefreshToken: '' },
      );
      if (!userRes.ok || userRes.val.modifiedCount < 1) return FAIL('Could Not Update');
      return Succeed(true);
    } catch (e) {
      return FAIL(e.message);
    }
  }

  /*
   * AuSr-5.1:
   */
  async resetTokens(resetToken: string): Promise<Resp<AuthTokenResponse>> {
    //  1. verify the refresh token
    const user = await this.getUserFromRefreshToken(resetToken);
    if (!user.ok) return FAIL(user.errMessage, user.code);

    //  2. generate new refresh token
    const refreshAuthToken = await this.generateAuthToken(user.val.usrToken, true);
    logTrace('generating tokns sucess', refreshAuthToken.expiresIn);
    /*
     * 3. update the users hashed refresh token
     *  here you can implement half life logic, if half life not reached skip this
     */
    const refreshUpdated = await this.updateHashedToken(
      user.val.user._id,
      refreshAuthToken.refreshToken,
    );
    if (!refreshUpdated) return FAIL(ErrConst.INTERNAL_ERROR);
    return Succeed({ authToken: refreshAuthToken, userData: user.val.user });
  }

  // when users access token experis, verifies users refresh token & returns the refresh token
  //Au.S-4.1  [logout & resetTokens]
  public async getUserFromRefreshToken(refreshToken: string): Promise<Resp<UserAndTokne>> {
    if (!refreshToken) return null;
    //1.verify the refresh token
    const decoded = await this.jwtService.verifyRefreshToken(refreshToken);
    if (!decoded.ok) return FAIL(decoded.errMessage, decoded.code);
    // find the User from database to mathch his refresh token
    const user: User = await this.usersService.findOneWithPwd({
      _id: decoded.val._id,
    });
    if (!user) return FAIL(ErrConst.USER_NOT_FOUND);
    const pickedUser = removeKeys(user, [
      'password',
      'hashedRefreshToken',
      'verificationCodeHash',
      'verificationCodeExpires',
    ]) as User;

    //compare the hashed refresh token and the users refresh token
    const isRefreshTokenMatching = await this.cryptoService.verifyHash(
      user.hashedRefreshToken,
      refreshToken,
    );
    if (!isRefreshTokenMatching) return FAIL('Tokens Not Matching');
    return Succeed({ usrToken: decoded.val, user: pickedUser });
  }

  //  ==========================   PASSWORD RESET OPERATIONS

  //AuSr-6 : request password/other reset code
  async sendResetCode(email: string) {
    try {
      // check the user exists, if it doesn't return null
      const user = await this.usersService.findOne({
        email: email,
        active: true,
      });
      if (!user.ok) return FAIL(ErrConst.USER_NOT_FOUND, user.code);

      return this.sendCodeAndUpdateHash(email, { email });
    } catch (e) {
      return FAIL(e.message);
    }
  }

  //AuSr-7: reset password
  async resetPassword(input: ResetPasswordInput) {
    try {
      const verifyToResetPwd = await this.verifyCode(input.email, input.code);
      if (!verifyToResetPwd) return FAIL('Code is wrong Or Have Expired');

      const hashedPwd = await this.cryptoService.createHash(input.newPassword);
      const usr = await this.usersService.findOneAndUpdate(
        { email: input.email },
        {
          password: hashedPwd,
          hashedRefreshToken: '',
        },
      );
      if (!usr.ok) return FAIL(usr.errMessage, usr.code);
      return Succeed(ResponseConsts.OPERATION_SUCCESS);
    } catch (e) {
      return FAIL(e.message, 500);
    }
  }

  // =====================================   Email Changing operations

  //  AuSr-8
  public async requestEmailChange(id: string, input: UpdateEmailInput) {
    //1. verify a user with the new email address doesnt exists
    const user = await this.usersService.findOneWithPwd({
      email: input.newEmail,
      active: true,
    });
    if (user) return FAIL(ErrConst.USER_EXISTS);

    //2. get the correct user
    const usr = await this.usersService.findById(id);
    if (!usr.ok) return FAIL(ErrConst.USER_NOT_FOUND);

    if (usr.val.email == input.newEmail) return FAIL(ErrConst.INVALID_INPUT);

    //3. send reset email code with the new email
    return this.sendCodeAndUpdateHash(input.newEmail, {
      newEmail: input.newEmail,
      email: usr.val.email,
    });
  }

  //  AuSr-9
  public async verifyUpdateEmail(id: string, input: VerifyCodeInput) {
    //1. get the current user
    const user = await this.usersService.findOneWithPwd({ _id: id });
    if (!user) return FAIL(ErrConst.USER_NOT_FOUND);

    // verify the code
    const verifyToUpdateEmail = await this.verifyCode(user.email, input.code);
    if (!verifyToUpdateEmail) return FAIL('Code is wrong Or Have Expired');
    // console.log('newEmail===', user.newEmail);
    const usr = await this.usersService.updateById(user._id, {
      email: user.newEmail,
      newEmail: '',
    });
    // console.log('updated email,', usr);
    if (!usr.ok) return FAIL(ErrConst.INTERNAL_ERROR);
    return Succeed(ResponseConsts.OPERATION_SUCCESS);
  }

  //  ------------------------   AUTHORIZATION OPERATIONS
  //  AuSr--
  public async getUserFromToken(token: string): Promise<User | null> {
    if (!token) return null;
    // logTrace('token ', token);
    const decoded = (await this.jwtService.verifyAccessToken(token)) as UserFromToken;
    if (!decoded || !decoded?._id) return null;
    logTrace('token Verified', decoded);
    const realUser = await this.usersService.findById(decoded._id);
    if (!realUser.val) return null;
    return realUser.val;
  }
}
