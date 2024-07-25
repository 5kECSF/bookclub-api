import { UploadDto } from '@/app/upload/upload.entity';
import { FAIL, Resp, Succeed } from '@/common/constants/return.consts';
import { ColorEnums, logTrace } from '@/common/logger';
import { generateUniqName } from '@/common/util/functions';
import { Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { Worker } from 'worker_threads';
import { FileUploadProvider } from '../../providers/upload';
interface ImageResizeResponse {
  buffer?: Buffer;
  error?: string;
}
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
    const res = await this.resizeSinglePicW(file);
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
        imageSharp = imageSharp.jpeg({ quality: 50 }).resize(1000);
      } else if (format === 'png') {
        imageSharp = imageSharp.png({ quality: 70 }).resize(1000);
      } else if (format === 'webp') {
        imageSharp = imageSharp.webp({ quality: 70 }).resize(1000);
      } else {
        // You can add handling for other image formats here
        // By default, just use JPEG compression
        imageSharp = imageSharp.jpeg({ quality: 70 });
      }

      const compressedImageBuffer = await imageSharp.toBuffer();
      logTrace('after', Buffer.byteLength(compressedImageBuffer), ColorEnums.BgCyan);
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

  public async resizeSinglePicW(file: Buffer): Promise<Resp<Buffer>> {
    // console.log(__dirname);
    const worker = new Worker(__dirname + '/cWorker.js', {
      workerData: {
        value: file,
        path: './cWorker.ts',
      },
    });
    return new Promise((resolve, reject) => {
      worker.on('message', async (data: ImageResizeResponse) => {
        if ('buffer' in data) {
          // const res = await this.resizeSinglePic(data.buffer);
          // if (!res.ok) return FAIL('resizing failed');
          resolve(Succeed(data.buffer));
        } else if ('error' in data) {
          reject(new Error(data.error));
        }
      });

      worker.on('error', (err) => {
        reject(err);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });

      worker.postMessage({ file });
    });
  }

  public async IUploadSingleImageW(file: Buffer, fName: string): Promise<Resp<UploadDto>> {
    const worker = new Worker('./compressWorker.ts');
    return new Promise((resolve, reject) => {
      worker.on('message', async (data: ImageResizeResponse) => {
        if ('buffer' in data) {
          // const res = await this.resizeSinglePic(data.buffer);
          // if (!res.ok) return FAIL('resizing failed');
          return this.fileUploadProvider.UploadOne(fName, data.buffer);
        } else if ('error' in data) {
          reject(new Error(data.error));
        }
      });

      worker.on('error', (err) => {
        reject(err);
      });

      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });

      // worker.postMessage({ file });
    });
  }
}
