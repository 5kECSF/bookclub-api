import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';

import { UpdateMeDto } from '../users/dto/user.mut.dto';
import { JwtGuardPr, UserServicePr } from './dependencies.profile';
import { Request } from 'express';
import { User } from '../users';
import { UserFromToken } from '../../common/common.types.dto';

@Controller('profile')
export class ProfileController {
  constructor(private usersService: UserServicePr) {}

  @Get('me')
  @UseGuards(JwtGuardPr)
  async getMe(@Req() req: Request) {
    const user: UserFromToken = req['user'];
    const res = await this.usersService.findById(user._id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  //Au.M-9 Update user
  @Patch('me')
  @UseGuards(JwtGuardPr)
  // @Roles(RoleType.ADMIN)
  async updateMe(@Req() req: Request, @Body() input: UpdateMeDto): Promise<User> {
    const user: UserFromToken = req['user'];
    const res = await this.usersService.updateById(user._id, input);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }
}
