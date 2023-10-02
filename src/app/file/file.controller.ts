import {
  applyDecorators,
  Body,
  Controller,
  Delete,
  HttpException,
  HttpStatus,
  Param,
  ParseFilePipeBuilder,
  Post,
  SetMetadata,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';

import { FileService } from './file.service';
import { Endpoint } from '../../common/constants/modelConsts';
import { ColorEnums, logTrace } from '../../common/logger';
import { IsNotEmpty, IsString } from 'class-validator';
import { imageFileRegex } from '../../common/common.types.dto';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';

export class SampleDto {
  @IsNotEmpty()
  @IsString()
  name?: string;

  @IsNotEmpty()
  @IsString()
  id: string;
}

const imageFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error, acceptFile: boolean) => void,
) => {
  if (!Boolean(file.mimetype.match(/(jpg|jpeg|png|gif)/))) callback(null, false);
  callback(null, true);
};

export const imageOptions: MulterOptions = {
  limits: { fileSize: 5242880 },
  fileFilter: imageFilter,
};

@Controller(Endpoint.File)
export class FileController {
  constructor(private fileService: FileService) {}

  @Delete(':id')
  async DeleteById(@Param('id') id: string) {
    const resp = await this.fileService.IDeleteImageById(id);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.val;
  }

  @ApiFile()
  @Post('single')
  async uploadSingle(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: imageFileRegex,
        })
        .addMaxSizeValidator({
          maxSize: 1000 * 1000 * 10, //10 mb
        })
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        }),
    )
    file: // @UploadeDecorator(1000 * 1000 * 10)
    Express.Multer.File,
    @Body() users: SampleDto,
  ) {
    logTrace('id is', users);
    const imgName = this.fileService.generateUniqName(file.originalname);
    const uploaded = await this.fileService.IUploadSingleImage(file.buffer, imgName.name);
    if (!uploaded.ok) return 'uploading failed';
    uploaded.val.imageId = imgName.uid;
    return uploaded.val;
  }

  @Post('multi')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'cover', maxCount: 1 },
        { name: 'images', maxCount: 3 },
      ],
      imageOptions,
    ),
  )
  async uploadMultiple(
    @Body() body: SampleDto,
    @UploadedFiles()
    files: { cover?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ) {
    const keys = Object.keys(files.cover[0]);
    // logTrace('files', files.images[1].originalname, ColorEnums.BgGreen);
    logTrace('files', files.images.length, ColorEnums.BgGreen);
    logTrace('files', keys, ColorEnums.BgGreen);
    // logTrace('files', files.images[0].filename, ColorEnums.BgGreen);
    //
    // const imgName = this.fileService.generateUniqName(files.cover[0].originalname);
    // const uploaded = await this.fileService.IUploadSingleImage(files[0].buffer, imgName.name);
    // if (!uploaded.ok) return 'uploading failed';
    //
    // const images = await this.fileService.uploadManyWithNewNames(files.images, imgName.uid);
    // if (!images.ok) throw new HttpException(images.errMessage, images.code);
    // return { ...uploaded.val, images: images.val };
  }
}

export const UploadeDecorator = (maxSize: number) => {
  const parseFilePipe = new ParseFilePipeBuilder()
    .addFileTypeValidator({
      fileType: imageFileRegex,
    })
    .addMaxSizeValidator({
      maxSize: maxSize,
    })
    .build({
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
    });

  return SetMetadata('uploadedFile', parseFilePipe);
};

export function ApiFile() {
  return applyDecorators(
    UseInterceptors(FileInterceptor('file')),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          file: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    }),
  );
}
