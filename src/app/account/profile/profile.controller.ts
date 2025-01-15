import {
  Body,
  Controller,
  Get,
  HttpException,
  Patch,
  Req,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';

import { FileProviderService } from '@/app/upload/file-provider.service';
import { ApiSingleFiltered } from '@/app/upload/fileParser';
import { UploadService } from '@/app/upload/upload.service';
import { Endpoint } from '@/common/constants/model.names';
import { MaxImageSize } from '@/common/constants/system.consts';
import { UserFromToken } from '@/common/types/common.types.dto';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { User } from '../users';
import { UpdateMeDto } from '../users/dto/user.mut.dto';
import { JwtGuardPr, UserServicePr } from './dependencies.profile';

@Controller(Endpoint.Profile)
@ApiTags(Endpoint.Profile)
export class ProfileController {
  constructor(
    private usersService: UserServicePr,
    private fileService: FileProviderService,
    private readonly uploadService: UploadService,
  ) {}

  @Get()
  @UseGuards(JwtGuardPr)
  async getMe(@Req() req: Request) {
    const user: UserFromToken = req['user'];
    const res = await this.usersService.findById(user._id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
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
      const update = await this.uploadService.UploadSingle(file, user._id);
      input.avatar = update.body;
    }
    const res = await this.usersService.updateById(user._id, input);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }
}
