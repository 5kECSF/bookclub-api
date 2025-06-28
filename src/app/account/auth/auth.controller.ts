import { EnvVar } from '@/common/config/config.instances';
import { Endpoint } from '@/common/constants/model.names';
import { Resp } from '@/common/constants/return.consts';
import { SystemConst } from '@/common/constants/system.consts';
import { ColorEnums, logTrace } from '@/common/logger';
import { UserFromToken } from '@/common/types/common.types.dto';
import { JwtGuard } from '@/providers/guards/guard.rest';
import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { RegisterUserInput, UserService } from '../users';
import { UpdateEmailInput } from '../users/entities/user.dto';
import { AuthService } from './auth.service';
import {
  EmailInput,
  LoginUserInput,
  ResetPasswordInput,
  TokenInput,
  VerifyCodeInput,
  VerifyEmailChangeInput,
} from './dto/auth.input.dto';
import { AuthTokenResponse } from './dto/auth.response.dto';

// @UseInterceptors(ClassSerializerInterceptor)
@Controller(Endpoint.Auth)
@ApiTags(Endpoint.Auth)
export class AuthController {
  constructor(private readonly authService: AuthService, private usersService: UserService) {}

  //Au.C-1 RegisterAndSendCode
  @Post('register')
  async registerAndSendCode(@Body() input: RegisterUserInput) {
    const resp = await this.authService.SERV_registerWithEmailCode(input);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return { message: resp.body };
  }

  //Au.C-2 AcivateRegistration
  @Post('activate')
  async activateWithCode(@Body() input: VerifyCodeInput) {
    const userResponse = await this.authService.SERV_activateAccountByCode(
      input.phoneOrEmail,
      input.code,
    );
    if (!userResponse.ok) throw new HttpException(userResponse.errMessage, userResponse.code);
    return userResponse.body;
  }

  //Au.C-3 Login
  @Post('login')
  async login(
    @Res({ passthrough: true }) response: Response,
    @Body() input: LoginUserInput,
  ): Promise<AuthTokenResponse> {
    const res = await this.authService.SERV_login(input);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    //setting tokens

    const options = {
      httpOnly: true,
      secure: EnvVar.getInstance.NODE_ENV == 'production',
    };
    response.cookie(SystemConst.REFRESH_COOKIE, res.body.authToken.refreshToken, options);
    // logTrace("user Login", res.val.authToken.expiresIn)
    return res.body;
  }

  //Au.C-4 Logout
  @Post('logout')
  async logOut(
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
    @Body() input: TokenInput,
  ): Promise<boolean> {
    let token;
    if (input.isCookie) {
      token = request.cookies[SystemConst.REFRESH_COOKIE];
    } else {
      token = input.refreshToken;
    }
    const resp = await this.authService.SERV_logOut(token);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    response.cookie(SystemConst.REFRESH_COOKIE, '');
    return resp.body;
  }

  //Au.C-5 resetTokens
  @Post('resetTokens')
  async resetTokens(
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
    @Body() input: TokenInput,
  ): Promise<AuthTokenResponse> {
    let token;
    // logTrace('input', input, ColorEnums.FgYellow);
    if (input.isCookie) {
      console.log('it is cookie');
      token = request.cookies[SystemConst.REFRESH_COOKIE];
    } else {
      token = input.refreshToken;
    }
    // logTrace("token is", token, ColorEnums.BgCyan)
    if (!token || token == 'undefined')
      throw new HttpException('NO Token Found', HttpStatus.UNAUTHORIZED);
    const resp = await this.authService.SERV_resetTokens(token);
    if (!resp.ok) {
      logTrace(resp.code, resp.errMessage, ColorEnums.FgRed);
      throw new HttpException(resp.errMessage, resp.code);
    }
    const options = {
      httpOnly: true,
      secure: EnvVar.getInstance.NODE_ENV == 'production',
    };
    response.cookie(SystemConst.REFRESH_COOKIE, resp.body.authToken.refreshToken, options);
    // console.log('reset tokens', resp.body.authToken.expiresIn);
    return resp.body;
  }

  //Au.C-6 forgotPassword
  @Post('forgotPassword')
  async forgotPassword(@Body() input: EmailInput): Promise<Resp<boolean>> {
    const res = await this.authService.SERV_sendResetCode(input.email);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res;
  }

  //Au.C-7 resetPassword
  @Post('resetPassword')
  async resetPassword(@Body() input: ResetPasswordInput): Promise<boolean> {
    const resp = await this.authService.SERV_resetPassword(input);
    return resp.ok;
  }

  //AuC-9 change Email
  @Post('requestEmailChange')
  @UseGuards(JwtGuard)
  // @Roles(RoleType.ADMIN)
  async requestEmailChange(@Req() req: Request, @Body() input: UpdateEmailInput) {
    const user: UserFromToken = req['user'];
    const ans = await this.authService.SERV_requestEmailChange(user._id, input);
    if (!ans.ok) throw new HttpException(ans.errMessage, ans.code);
    return ans.body;
    // return this.profileService.update(user._id, input);
  }

  //AuC-10 verify the code and update the email
  @Post('verifyUpdateEmail')
  @UseGuards(JwtGuard)
  async verifyUpdateEmail(@Req() req: Request, @Body() input: VerifyEmailChangeInput) {
    const user: UserFromToken = req['user'];

    const ans = await this.authService.SERV_verifyUpdateEmail(user._id, input);
    if (!ans.ok) throw new HttpException(ans.errMessage, ans.code);
    return ans.body;
    // return this.profileService.update(user._id, input);
  }
}
