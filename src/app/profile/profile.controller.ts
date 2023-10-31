import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';

import { UpdateMeDto } from '../users/dto/user.mut.dto';
import { JwtGuardPr, UserServicePr } from './dependencies.profile';
import { Express, Request } from 'express';
import { User } from '../users';
import { UserFromToken } from '../../common/common.types.dto';
import { Endpoint } from '../../common/constants/model.consts';
import { ApiSingleFiltered } from '../file/fileParser';
import { MaxImageSize } from '../../common/constants/system.consts';
import { FileService } from '../file/file.service';

@Controller(Endpoint.Profile)
export class ProfileController {
  constructor(private usersService: UserServicePr, private fileService: FileService) {}

  @Get()
  @UseGuards(JwtGuardPr)
  async getMe(@Req() req: Request) {
    const user: UserFromToken = req['user'];
    const res = await this.usersService.findById(user._id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  //Au.M-9 Update user
  @Patch()
  @UseGuards(JwtGuardPr)
  @ApiSingleFiltered('file', false, MaxImageSize)
  async updateMe(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
    @Body() input: UpdateMeDto,
  ): Promise<User> {
    const user: UserFromToken = req['user'];
    if (file && file.buffer) {
      const update = await this.fileService.IUploadSingleImage(file.buffer, `${user._id}.jpg`);
      input.avatar = update.val;
    }
    const res = await this.usersService.updateById(user._id, input);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }
}
