import {
  Body,
  Controller,
  Delete,
  HttpException,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UploadedFiles,
} from '@nestjs/common';

import { Express } from 'express';

import { FileService } from './file.service';
import { Endpoint } from '../../common/constants/modelConsts';
import { ColorEnums, logTrace } from '../../common/logger';
import { IsNotEmpty, IsString } from 'class-validator';

import { ApiManyFiltered, ApiSingleFiltered } from './fileParser';

export class SampleDto {
  @IsNotEmpty()
  @IsString()
  name?: string;

  @IsNotEmpty()
  @IsString()
  id: string;
}

@Controller(Endpoint.File)
export class FileController {
  constructor(private fileService: FileService) {}

  @Delete(':id')
  async DeleteById(@Param('id') id: string) {
    const resp = await this.fileService.IDeleteImageById(id);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.val;
  }

  @ApiSingleFiltered('file', true, 50000)
  @Post('single')
  async uploadSingle(@UploadedFile() file: Express.Multer.File, @Body() users: SampleDto) {
    logTrace('id is', users);
    const imgName = this.fileService.generateUniqName(file.originalname);
    const uploaded = await this.fileService.IUploadSingleImage(file.buffer, imgName.name);
    if (!uploaded.ok) return 'uploading failed';
    uploaded.val.imageId = imgName.uid;
    return uploaded.val;
  }

  @Post('multi')
  @ApiManyFiltered('cover', 'images', 3, 1000 * 1000)
  async uploadMultiple(
    @Body() body: SampleDto,
    @UploadedFiles()
    files: { cover?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    const keys = Object.keys(files);
    const keys2 = Object.keys(files.images[0]);
    const keys3 = Object.keys(files.cover[0]);
    logTrace('files', keys, ColorEnums.BgGreen);
    logTrace('files2', keys2, ColorEnums.BgGreen);
    logTrace('files3', keys3, ColorEnums.BgGreen);
    logTrace('files', files.images.length, ColorEnums.BgGreen);
    logTrace('files', files.images[1].originalname, ColorEnums.BgGreen);
    // logTrace('file', files);
    // logTrace('files', files.images[0].filename, ColorEnums.BgGreen);
    //
    const imgName = this.fileService.generateUniqName(files.cover[0].originalname);
    const uploaded = await this.fileService.IUploadSingleImage(files.cover[0].buffer, imgName.name);
    if (!uploaded.ok) throw new HttpException(uploaded.errMessage, uploaded.code);

    const images = await this.fileService.uploadManyWithNewNames(files.images, imgName.uid);
    if (!images.ok) throw new HttpException(images.errMessage, images.code);
    return { ...uploaded.val, images: images.val };
  }
}
