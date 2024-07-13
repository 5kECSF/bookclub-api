import { Injectable } from '@nestjs/common';
import { FAIL, Resp, Succeed } from '@/common/constants/return.consts';
import * as sharp from 'sharp';
import { ColorEnums, logTrace } from '@/common/logger';
import { FileUploadProvider } from '../../providers/upload';
import { UploadDto } from '@/app/upload/upload.entity';
import { generateUniqName } from '@/common/util/functions';

@Injectable()
export class FileProviderService {
  constructor(private fileUploadProvider: FileUploadProvider) {}

  public async IUploadWithNewName(
    file: Express.Multer.File,
    uid?: string,
    ctr?: number,
  ): Promise<Resp<UploadDto>> {
    const imgName = generateUniqName(file.originalname, uid, ctr);
    const uploaded = await this.IUploadSingleImage(file.buffer, imgName.name);
    uploaded.val.uid = imgName.uid;
    if (!uploaded.ok) return FAIL(uploaded.errMessage, uploaded.code);
    return Succeed(uploaded.val);
  }

  public async IUploadSingleImage(file: Buffer, fName: string): Promise<Resp<UploadDto>> {
    const res = await this.resizeSinglePic(file);
    if (!res.ok) return FAIL('resizing failed');
    // return await FUploadToFirebaseFunc(fName, res.val);
    return this.fileUploadProvider.UploadOne(fName, res.val);
  }

  public async IDeleteImageByPrefix(id): Promise<Resp<any>> {
    return this.fileUploadProvider.deleteImageByPrefix(id);
  }

  // resizing image
  public async resizeSinglePic(file: Buffer): Promise<Resp<Buffer>> {
    if (!file) return FAIL('no image found');
    try {
      logTrace('before', Buffer.byteLength(file.buffer), ColorEnums.BgYellow);
      const { format } = await sharp(file).metadata();
      let imageSharp = sharp(file);

      // Apply different settings based on the image format
      if (format === 'jpeg' || format === 'jpg') {
        imageSharp = imageSharp.jpeg({ quality: 70 });
      } else if (format === 'png') {
        imageSharp = imageSharp.png({ quality: 70 });
      } else if (format === 'webp') {
        imageSharp = imageSharp.webp({ quality: 70 });
      } else {
        // You can add handling for other image formats here
        // By default, just use JPEG compression
        imageSharp = imageSharp.jpeg({ quality: 70 });
      }

      const compressedImageBuffer = await imageSharp.toBuffer();
      return Succeed(compressedImageBuffer);
      // const data = await sharp(upload)
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
}
