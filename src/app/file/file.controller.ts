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
import { Endpoint } from '../../common/constants/model.consts';
import { logTrace } from '../../common/logger';
import { IsOptional, IsString } from 'class-validator';

import { ApiManyFiltered, ApiSingleFiltered, ParseFile } from './fileParser';
import { MaxImageSize } from '../../common/constants/system.consts';

export class SampleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
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

  @ApiSingleFiltered('file', true, MaxImageSize)
  @Post('single')
  async uploadSingle(@UploadedFile(ParseFile) file: Express.Multer.File, @Body() users: SampleDto) {
    logTrace('id is', users);
    const img = await this.fileService.UploadSingle(file);
    if (!img.ok) throw new HttpException(img.errMessage, img.code);

    return img.val;
  }

  @Post('multi')
  @ApiManyFiltered('cover', 'images', 3, MaxImageSize)
  async uploadMultiple(
    @Body() body: SampleDto,
    @UploadedFiles()
    files: { cover?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    const imageObj = await this.fileService.ControllerUploadCoverAndImages(files);
    if (!imageObj.ok) throw new HttpException(imageObj.errMessage, imageObj.code);
    return imageObj.val;
  }
}
