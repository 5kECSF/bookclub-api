import { Endpoint } from '@/common/constants/model.names';
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
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';

import {
  UpdateBody,
  UpdateDto,
  Upload,
  UploadFilter,
  UploadQuery,
} from '@/app/upload/upload.entity';
import { UploadService } from '@/app/upload/upload.service';
import { MaxImageSize } from '@/common/constants/system.consts';
import { ColorEnums, logTrace } from '@/common/logger';
import { PaginatedRes, UserFromToken } from '@/common/types/common.types.dto';
import { RoleType } from '@/common/types/enums';
import { JsonRes, ThrowRes } from '@/common/util/responseFunctions';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { ToBeAdded } from '@/providers/upload/firebase';
import { ApiTags } from '@nestjs/swagger';
import { ApiManyFiltered, ApiSingleFiltered, ParseFile } from './fileParser';

@Controller(Endpoint.File)
@ApiTags(Endpoint.File)
export class UploadController {
  constructor(private uploadService: UploadService) {}

  //Upload file by getting the filesId from the user
  @Post(':id')
  @ApiSingleFiltered('file', true, MaxImageSize)
  @UseGuards(JwtGuard)
  async uploadDraft(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Param('id') id: string,
  ) {
    if (!file || !file.buffer) throw new HttpException('no upload Found', 400);
    const user: UserFromToken = req['user'];

    const res = await this.uploadService.UploadDraftImg(file, id, user._id);
    if (!res.ok) ThrowRes(res);
    return res.body;
  }

  @Patch(':id')
  @ApiSingleFiltered('file', true, MaxImageSize)
  @UseGuards(JwtGuard)
  async updateById(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Param('id') id: string,
  ) {
    if (!file || !file.buffer) throw new HttpException('no upload Found', 400);
    const user: UserFromToken = req['user'];

    const query = { _id: id };
    if (user.role != RoleType.ADMIN) {
      query['userId'] = user._id;
    }
    const res = await this.uploadService.UpdateSingle(file, query, user._id);
    if (!res.ok) ThrowRes(res);
    return res.body;
  }

  //used to update the upload models data only, with out updating the file
  @Patch('data/:id')
  @UseGuards(JwtGuard)
  async updateDataById(@Req() req: Request, @Body() updateDto: UpdateDto, @Param('id') id: string) {
    const user: UserFromToken = req['user'];

    const query = { _id: id };
    if (user.role != RoleType.ADMIN) {
      query['userId'] = user._id;
    }
    const res = await this.uploadService.findOneAndUpdate(query, updateDto);
    if (!res.ok) ThrowRes(res);
    return res.body;
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
    if (!deleteResp.ok) if (!deleteResp.ok) ThrowRes(deleteResp);
    return deleteResp.body;
  }

  //===============================     Muti Operations ==========

  //Upload many files by getting the filesId from the user
  @UseGuards(JwtGuard)
  @Post('multi/:id')
  @ApiManyFiltered('cover', 'images', 3, MaxImageSize)
  async createDraftWithCover(
    @Req() req: Request,
    @Res() res: Response,
    @UploadedFiles()
    files: { cover?: Express.Multer.File[]; images?: Express.Multer.File[] },
    @Param('id') id: string,
  ) {
    const user: UserFromToken = req['user'];
    const imageObj = await this.uploadService.UploadDraftWithCover(files, id, user?._id);
    return JsonRes(res, imageObj);
  }

  // @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  @Patch('multi/:id')
  @ApiManyFiltered('cover', 'images', 3, MaxImageSize)
  async updateWithCover(
    @Req() req: Request,
    @UploadedFiles()
    files: { cover?: Express.Multer.File[]; images?: Express.Multer.File[] },
    @Param('id') id: string,
    @Body() updateDto: UpdateBody,
  ) {
    // logTrace('name==', id);
    const user: UserFromToken = req['user'];
    const data = await this.uploadService.UpdateWithCover(files, id, user, updateDto);
    if (!data.ok) throw new HttpException(data.errMessage, data.code);
    logTrace('update mulit suceed', data.body, ColorEnums.BgCyan);
    return data.body;
  }

  //================================================     Query Operations ==========

  @Get('')
  async filterAndPaginate(@Query() inputQuery: UploadQuery): Promise<PaginatedRes<Upload>> {
    const res = await this.uploadService.searchManyAndPaginate(
      ['fileName'],
      inputQuery,
      UploadFilter,
    );
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const res = await this.uploadService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Post()
  async getUrls(@Body() updateDto: UpdateBody) {
    const urls = [];
    for (const img of updateDto.removedImages) {
      urls.push(`${ToBeAdded}${img}?alt=media`);
    }
    return urls;
  }

  // ===========================    UNUSED =====================

  //Upload file with out the fileName from the user
  @UseGuards(JwtGuard)
  @Post('single')
  @ApiSingleFiltered('file', true, MaxImageSize)
  async createSingle(
    @Req() req: Request,
    @UploadedFile(ParseFile) file: Express.Multer.File,
  ): Promise<Upload> {
    const user: UserFromToken = req['user'];
    logTrace('user is', user);
    const img = await this.uploadService.UploadSingle(file, user?._id);
    if (!img.ok) ThrowRes(img);
    return img.body;
  }

  // @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  @Post('multi')
  @ApiManyFiltered('cover', 'images', 3, MaxImageSize)
  async createWithCover(
    @Req() req: Request,
    @UploadedFiles()
    files: { cover?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    const user: UserFromToken = req['user'];
    const imageObj = await this.uploadService.UploadWithCover(files, user?._id);
    if (!imageObj.ok) throw new HttpException(imageObj.errMessage, imageObj.code);
    logTrace('upload mulit suceed', imageObj.body, ColorEnums.BgCyan);

    return imageObj.body;
  }
}
