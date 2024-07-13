import { UserFromToken } from '@/common/common.types.dto';
import { EnvVar } from '@/common/config/config.instances';
import { Endpoint } from '@/common/constants/model.consts';
import { SystemConst } from '@/common/constants/system.consts';
import { ColorEnums, logTrace } from '@/common/logger';
import { JwtGuard } from '@/providers/guards/guard.rest';
import {
  BadRequestException,
  Body,
  Controller,
  HttpException,
  Patch,
  Post,
  Req,
  Res,
  UseGuards
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { RegisterUserInput, UserService } from '../users';
import { UpdateEmailInput } from '../users/dto/user.mut.dto';
import { AuthService } from './auth.service';
import {
  ChangePasswordInput,
  EmailInput,
  LoginUserInput,
  ResetPasswordInput,
  TokenInput,
  VerifyCodeInput,
} from './dto/auth.input.dto';
import { AuthTokenResponse } from './dto/auth.response.dto';

// @UseInterceptors(ClassSerializerInterceptor)
@Controller(Endpoint.Auth)
@ApiTags(Endpoint.Auth)
export class AuthController {
  constructor(private readonly authService: AuthService, private usersService: UserService) {}

  //Au.C-1 RegisterAndSendCode
  @Post('signup')
  async registerAndSendCode(@Body() input: RegisterUserInput) {
    const resp = await this.authService.registerWithEmailCode(input);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return { message: resp.val };
  }

  //Au.C-2 AcivateRegistration
  @Post('activate')
  async activateWithCode(@Body() input: VerifyCodeInput) {
    const userResponse = await this.authService.activateAccountByCode(
      input.phoneOrEmail,
      input.code,
    );
    if (!userResponse.ok) throw new BadRequestException(userResponse.errMessage);
    return userResponse.val;
  }

  //Au.C-3 Login
  @Post('login')
  async login(
    @Res({ passthrough: true }) response: Response,
    @Body() input: LoginUserInput,
  ): Promise<AuthTokenResponse> {
    const res = await this.authService.login(input);
    if (!res.ok) throw new BadRequestException(res.errMessage);
    //setting tokens

    const options = {
      httpOnly: true,
      secure: EnvVar.getInstance.NODE_ENV == 'production',
    };
    response.cookie(SystemConst.REFRESH_COOKIE, res.val.authToken.refreshToken, options);
    // logTrace("user Login", res.val.authToken.expiresIn)
    return res.val;
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
    const resp = await this.authService.logOut(token);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    response.cookie(SystemConst.REFRESH_COOKIE, '');
    return resp.val;
  }

  //Au.C-5 resetTokens
  @Post('resetTokens')
  async resetTokens(
    @Res({ passthrough: true }) response: Response,
    @Req() request: Request,
    @Body() input: TokenInput,
  ): Promise<AuthTokenResponse> {
    let token;
    logTrace('input', input, ColorEnums.BgBlue);
    if (input.isCookie) {
      console.log('it is cookie');
      token = request.cookies[SystemConst.REFRESH_COOKIE];
    } else {
      token = input.refreshToken;
    }
    // logTrace("token is", token, ColorEnums.BgCyan)
    if (!token || token == 'undefined') throw new HttpException('NO Token Found', 400);
    const resp = await this.authService.resetTokens(token);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    const options = {
      httpOnly: true,
      secure: EnvVar.getInstance.NODE_ENV == 'production',
    };
    response.cookie(SystemConst.REFRESH_COOKIE, resp.val.authToken.refreshToken, options);
    console.log('reset tokens', resp.val.authToken.expiresIn);
    return resp.val;
  }

  //Au.C-6 forgotPassword
  @Post('forgotPassword')
  async forgotPassword(@Body() input: EmailInput): Promise<boolean> {
    const res = await this.authService.sendResetCode(input.email);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  //Au.C-7 resetPassword
  @Post('resetPassword')
  async resetPassword(@Body() input: ResetPasswordInput): Promise<boolean> {
    const resp = await this.authService.resetPassword(input);
    return resp.ok;
  }

  //AuC-8 change password
  @Patch('changePassword')
  @UseGuards(JwtGuard)
  async ChangePassword(@Req() req: Request, @Body() input: ChangePasswordInput) {
    const user: UserFromToken = req['user'];

    const ans = await this.usersService.changePassword(user._id, input);
    if (!ans.ok) throw new HttpException(ans.errMessage, ans.code);
    return ans.val;
    // return this.profileService.update(user._id, input);
  }

  //AuC-9 change Email
  @Patch('requestEmailChange')
  @UseGuards(JwtGuard)
  // @Roles(RoleType.ADMIN)
  async requestEmailChange(@Req() req: Request, @Body() input: UpdateEmailInput) {
    const user: UserFromToken = req['user'];
    const ans = await this.authService.requestEmailChange(user._id, input);
    if (!ans.ok) throw new HttpException(ans.errMessage, ans.code);
    return ans.val;
    // return this.profileService.update(user._id, input);
  }

  //AuC-10 verify the code and update the email
  @Patch('verifyUpdateEmail')
  @UseGuards(JwtGuard)
  // @Roles(RoleType.ADMIN)
  async verifyUpdateEmail(@Req() req: Request, @Body() input: VerifyCodeInput) {
    const user: UserFromToken = req['user'];

    const ans = await this.authService.verifyUpdateEmail(user._id, input);
    if (!ans.ok) throw new HttpException(ans.errMessage, ans.code);
    return ans.val;
    // return this.profileService.update(user._id, input);
  }
}
