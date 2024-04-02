import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { Express } from 'express';

import { Endpoint } from '@/common/constants/model.consts';

import { ApiManyFiltered, ApiSingleFiltered, ParseFile } from './fileParser';
import { MaxImageSize } from '@/common/constants/system.consts';
import { ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { PaginatedRes, RoleType, UserFromToken } from '@/common/common.types.dto';
import { UploadService } from '@/app/upload/upload.service';
import { Roles } from '@/providers/guards/roles.decorators';
import { Upload, UploadBody, UploadDto, UploadQuery } from '@/app/upload/upload.entity';
import { logTrace } from '@/common/logger';

@Controller(Endpoint.File)
@ApiTags(Endpoint.File)
export class UploadController {
  constructor(private uploadService: UploadService) {}

  // @UseGuards(JwtGuard)
  @ApiSingleFiltered('file', true, MaxImageSize)
  @Post('single')
  async uploadSingle(
    @Req() req: Request,
    @UploadedFile(ParseFile) file: Express.Multer.File,
  ): Promise<UploadDto> {
    const user: UserFromToken = req['user'];
    const img = await this.uploadService.UploadSingle(file, user?._id);
    if (!img.ok) throw new HttpException(img.errMessage, img.code);
    return img.val;
  }

  @Patch(':name')
  @UseGuards(JwtGuard)
  @ApiSingleFiltered('file', true, MaxImageSize)
  async updateByName(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Param('name') name: string,
  ) {
    if (!file || !file.buffer) throw new HttpException('no upload Found', 400);
    const user: UserFromToken = req['user'];

    const query = { fileName: name };
    if (user.role != RoleType.ADMIN) {
      query['userId'] = user._id;
    }

    const res = await this.uploadService.UpdateSingle(file, query, user._id);

    return res.val;
  }

  @Delete(':name')
  @UseGuards(JwtGuard)
  async DeleteByName(@Req() req: Request, @Param('name') name: string) {
    //TODO fix this to use the upload name or url to delete the upload

    const user: UserFromToken = req['user'];
    const query = { fileName: name };
    if (user.role != RoleType.ADMIN) {
      query['userId'] = user._id;
    }
    const deleteResp = await this.uploadService.deleteFileByQuery(query);
    if (!deleteResp.ok) throw new HttpException(deleteResp.errMessage, deleteResp.code);
    return deleteResp.val;
  }

  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  @Post('multi')
  @ApiManyFiltered('cover', 'images', 3, MaxImageSize)
  async uploadWithCover(
    @Req() req: Request,
    @UploadedFiles()
    files: { cover?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    const user: UserFromToken = req['user'];
    const imageObj = await this.uploadService.UploadWithCover(files, user._id);
    if (!imageObj.ok) throw new HttpException(imageObj.errMessage, imageObj.code);
    return imageObj.val;
  }

  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  @Patch('multi/:id')
  @ApiManyFiltered('cover', 'images', 3, MaxImageSize)
  async updateWithCover(
    @Req() req: Request,
    @UploadedFiles()
    files: { cover?: Express.Multer.File[]; images?: Express.Multer.File[] },
    @Param('id') id: string,
    @Body() updateDto: UploadBody,
  ) {
    logTrace('name==', id);
    const user: UserFromToken = req['user'];
    const data = await this.uploadService.UpdateWithCover(files, id, user, updateDto);
    if (!data.ok) throw new HttpException(data.errMessage, data.code);
    return data.val;
  }

  @Get('')
  async filterAndPaginate(@Query() inputQuery: UploadQuery): Promise<PaginatedRes<Upload>> {
    const res = await this.uploadService.searchManyAndPaginate(['fileName'], inputQuery);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }
}
