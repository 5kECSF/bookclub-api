// This file provider resizes, calls uploadFile & delte file by name

import { UploadDto } from '@/app/upload/upload.entity';
import { FAIL, Resp, Succeed } from '@/common/constants/return.consts';
import { ColorEnums, logTrace } from '@/common/logger';
import { generateUniqName } from '@/common/util/random-functions';
import { FILE_SERVICE } from '@/providers/upload/file.module';
import { FileServiceInterface } from '@/providers/upload/firebase';
import { Inject, Injectable } from '@nestjs/common';
import * as sharp from 'sharp';
import { Worker } from 'worker_threads';
// import { FileUploadProvider } from '../../providers/upload';
interface ImageResizeResponse {
  buffer?: Buffer;
  error?: string;
}
@Injectable()
export class FileProviderService {
  constructor(@Inject(FILE_SERVICE) private readonly fileService: FileServiceInterface) {}

  //generate new name & IUploadSingleImage ||
  //dont need it for the new function because the image is generated first
  public async IUploadWithNewName(
    file: Express.Multer.File,
    uid?: string,
    ctr?: number,
  ): Promise<Resp<UploadDto>> {
    const imgName = generateUniqName(file.originalname, uid, ctr);
    const uploaded = await this.IUploadSingleImage(file.buffer, imgName.name);
    if (!uploaded.ok) return FAIL(uploaded.errMessage, uploaded.code);
    uploaded.body.uid = imgName.uid;
    return Succeed(uploaded.body);
  }

  //given a name it resizes the file and uploads it & is the one used with the new function
  public async IUploadSingleImage(file: Buffer, fName: string): Promise<Resp<UploadDto>> {
    const res = await this.resizeSinglePicW(file);
    if (!res.ok) return FAIL('resizing failed');
    // return await FUploadToFirebaseFunc(fName, res.val);
    const resp = await this.fileService.UploadOne(fName, res.body);
    return resp;
  }

  //IDeleteImageByPrefix this delete images given a prifix
  public async IDeleteImageByPrefix(id: string): Promise<Resp<any>> {
    if (!id || id.length < 3) return FAIL('file not defined', 400);
    return this.fileService.deleteFileByPrefix(id);
  }

  public async IDeleteImageByName(id): Promise<Resp<any>> {
    return this.fileService.deleteFileByName(id);
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

  //==========================   UNUSED ====================
  //========================================================

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
      // logTrace('after', Buffer.byteLength(compressedImageBuffer), ColorEnums.BgCyan);
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

  public async IUploadSingleImageW(file: Buffer, fName: string): Promise<Resp<UploadDto>> {
    const worker = new Worker('./compressWorker.ts');
    return new Promise((resolve, reject) => {
      worker.on('message', async (data: ImageResizeResponse) => {
        if ('buffer' in data) {
          // const res = await this.resizeSinglePic(data.buffer);
          // if (!res.ok) return FAIL('resizing failed');
          return this.fileService.UploadOne(fName, data.buffer);
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
