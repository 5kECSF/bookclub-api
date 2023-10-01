import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  HttpException,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseFilePipeBuilder,
  Post,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';

import { FileService } from './file.service';
import { Endpoint } from '../../common/constants/modelConsts';

export class SampleDto {
  name?: string;
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

  @UseInterceptors(FileInterceptor('file'))
  @Post('single')
  async uploadSingle(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'image/jpeg',
        })
        .addMaxSizeValidator({
          maxSize: 1000 * 1000 * 10, //10 mb
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file?: Express.Multer.File,
  ) {
    const imgName = this.fileService.generateUniqName(file.originalname);
    const uploaded = await this.fileService.IUploadSingleImage(file.buffer, imgName.name);
    if (!uploaded.ok) return 'uploading failed';
    uploaded.val.imageId = imgName.uid;
    return uploaded.val;
  }

  @Post('mulit')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cover', maxCount: 1 },
      { name: 'images', maxCount: 3 },
    ]),
  )
  async uploadMultiple(
    @Body() body: SampleDto,
    @UploadedFiles(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: 'image/jpeg',
        })
        .addMaxSizeValidator({
          maxSize: 10000,
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    files: { cover?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    const imgName = this.fileService.generateUniqName(files.cover[0].originalname);
    const uploaded = await this.fileService.IUploadSingleImage(files[0].buffer, imgName.name);
    if (!uploaded.ok) return 'uploading failed';

    const images = await this.fileService.uploadManyWithNewNames(files.images, imgName.uid);
    if (!images.ok) throw new HttpException(images.errMessage, images.code);
    return { ...uploaded.val, images: images.val };
  }
}
