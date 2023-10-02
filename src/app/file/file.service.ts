import { Injectable } from '@nestjs/common';
// import { deleteFirebaseImageById, FUploadToFirebaseFunc } from '../../providers/firebase';
import { FAIL, Resp, Succeed } from '../../common/constants/response.const';
import * as sharp from 'sharp';
import * as crypto from 'crypto';
import { ColorEnums, logTrace } from '../../common/logger';
import { ImageObj } from './file.dto';
import { Express } from 'express';
import { FileUploadProvider } from '../../providers/upload';

interface Img {
  uid?: string;
  name: string;
}

@Injectable()
export class FileService {
  constructor(private fileUploadProvider: FileUploadProvider) {}

  public generateUniqName(fileName: string, uid = '', ctr = 0): Img {
    const length = 16;
    if (uid === '')
      uid = crypto
        .randomBytes(Math.ceil(length / 2))
        .toString('hex')
        .slice(0, length);

    const names = fileName.split('.');
    const name = names[0].trim();
    const ext = names[names.length - 1];
    return { name: `${uid}-${name}-${Date.now()}-${ctr}.${ext}`, uid: uid };
  }

  public async uploadManyWithNewNames(
    files: Express.Multer.File[],
    uid = '',
  ): Promise<Resp<string[]>> {
    const names = [];
    try {
      await Promise.all(
        files.map(async (file, i) => {
          const filename = this.generateUniqName(file.originalname, uid, i).name;

          const result = await this.IUploadSingleImage(file.buffer, filename);
          if (!result.ok) return FAIL('failed uploading multi images, in a loop');

          names.push(result.val.fullImg);
        }),
      );
      return Succeed(names);
    } catch (e) {
      return FAIL(e.message);
    }
  }

  // resizing image
  public async resizeSinglePic(file: Buffer): Promise<Resp<Buffer>> {
    if (!file) return FAIL('no image found');
    try {
      logTrace('before', Buffer.byteLength(file.buffer), ColorEnums.BgYellow);

      // Perform compression using Sharp
      const compressedImageBuffer = await sharp(file)
        // .resize({ width: 500, height: 500 }) // Adjust dimensions as needed
        // .jpeg({ quality: 70, mozjpeg: true })
        .webp({ quality: 70 })
        .toBuffer();
      logTrace('after', Buffer.byteLength(compressedImageBuffer), ColorEnums.BgYellow);
      return Succeed(compressedImageBuffer);
      // const data = await sharp(file)
      //   .toFormat('jpeg')
      //   // .toFormat("jpeg", { mozjpeg: true })
      //   // .jpeg({quality: 50})
      //   .jpeg({ mozjpeg: true })
      //   .resize(500, 500)
      //   .toBuffer();
      // return Succeed(data);
    } catch (e) {
      return FAIL(e.message);
    }
  }

  public async IUploadSingleImage(file: Buffer, fName: string): Promise<Resp<ImageObj>> {
    const res = await this.resizeSinglePic(file);
    if (!res.ok) return FAIL('resizing failed');
    // return await FUploadToFirebaseFunc(fName, res.val);
    return this.fileUploadProvider.UploadOne(fName, res.val);
  }

  public async IDeleteImageById(id): Promise<Resp<any>> {
    return this.fileUploadProvider.deleteImageById(id);
  }
}
