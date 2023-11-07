import {
  applyDecorators,
  ArgumentMetadata,
  BadRequestException,
  HttpStatus,
  Injectable,
  ParseFilePipeBuilder,
  PipeTransform,
  SetMetadata,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import {
  MulterOptions,
  MulterField,
} from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { Express } from 'express';
import { imageFileRegex } from '../../common/common.types.dto';

import {
  ReferenceObject,
  SchemaObject,
} from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { FileFieldsInterceptor } from '@nestjs/platform-express';

export type UploadFields = MulterField & { required?: boolean };
import { UnsupportedMediaTypeException } from '@nestjs/common';
import { MaxImageSize } from '../../common/constants/system.consts';

@Injectable()
export class ParseFile implements PipeTransform {
  transform(
    files: Express.Multer.File | Express.Multer.File[],
    metadata: ArgumentMetadata,
  ): Express.Multer.File | Express.Multer.File[] {
    if (files === undefined || files === null) {
      // console.log('files===>', files)
      throw new BadRequestException('Validation failed (file expected)');
    }
    if (Array.isArray(files) && files.length === 0) {
      throw new BadRequestException('Validation failed (files expected)');
    }

    return files;
  }
}

export function fileMimetypeFilter(size: number, ...mimetypes: string[]) {
  return (
    req,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    if (mimetypes.some((m) => file.mimetype.includes(m))) {
      if (file.size < size) callback(null, true);
      else
        callback(
          new UnsupportedMediaTypeException(`File size bigger than: ${size} not supported`),
          false,
        );
    } else {
      callback(
        new UnsupportedMediaTypeException(`File type is not matching: ${mimetypes.join(', ')}`),
        false,
      );
    }
  };
}

export const imageFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error, acceptFile: boolean) => void,
) => {
  if (!Boolean(file.mimetype.match(/(jpg|jpeg|png|gif)/))) {
    callback(
      new UnsupportedMediaTypeException(`File type is not matching: allowed, Images`),
      false,
    );
  }
  callback(null, true);
};
export const imageOptions = (size = MaxImageSize): MulterOptions => {
  const options = {
    limits: { fileSize: size },
    fileFilter: imageFilter,
  };
  return options;
};

/**
 *  =====================================  Multiple Files upload decorators
 * @param uploadFields
 * @param localOptions
 * @constructor
 */
export function ApiFileFields(uploadFields: UploadFields[], localOptions?: MulterOptions) {
  const bodyProperties: Record<string, SchemaObject | ReferenceObject> = Object.assign(
    {},
    ...uploadFields.map((field) => {
      return { [field.name]: { type: 'string', format: 'binary' } };
    }),
  );
  const apiBody = ApiBody({
    schema: {
      type: 'object',
      properties: bodyProperties,
      required: uploadFields.filter((f) => f.required).map((f) => f.name),
    },
  });

  return applyDecorators(
    UseInterceptors(FileFieldsInterceptor(uploadFields, localOptions)),
    ApiConsumes('multipart/form-data'),
    // apiBody,
  );
}

export function ApiManyFiltered(file1, file2, maxCount2, size = MaxImageSize) {
  return ApiFileFields(
    [
      { name: file1, maxCount: 1 },
      { name: file2, maxCount: maxCount2 },
    ],
    imageOptions(size),
  );
}

/**
 * =================================   For single file upload decorator
 * @param fieldName
 * @param required
 * @param localOptions
 * @constructor
 */
export function ApiFile(fieldName = 'file', required = false, localOptions?: MulterOptions) {
  return applyDecorators(
    UseInterceptors(FileInterceptor(fieldName, localOptions)),
    ApiConsumes('multipart/form-data'),
    // ApiBody({
    //   schema: {
    //     type: 'object',
    //     required: required ? [fieldName] : [],
    //     properties: {
    //       [fieldName]: {
    //         type: 'string',
    //         format: 'binary',
    //       },
    //     },
    //   },
    // }),
  );
}

export function ApiSingleFiltered(name, required, size = MaxImageSize) {
  return ApiFile(name, required, imageOptions(size));
}

/**
 * =================================  Deprecated ones   ===============================================
 * @constructor
 */

// export function ApiFile() {
//   return applyDecorators(
//     UseInterceptors(FileInterceptor('file')),
//     ApiConsumes('multipart/form-data'),
//     ApiBody({
//       schema: {
//         type: 'object',
//         properties: {
//           file: {
//             type: 'string',
//             format: 'binary',
//           },
//         },
//       },
//     }),
//   );
// }

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
