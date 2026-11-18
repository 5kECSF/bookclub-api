// This file provider resizes, calls uploadFile & delte file by name

import { UploadDto } from '@/app/upload/upload.entity';
import { FAIL, Resp, Succeed } from '@/common/constants/return.consts';
import { ColorEnums, logTrace } from '@/common/logger';
import { generateUniqName } from '@/common/util/random-functions';
import { FILE_SERVICE } from '@/providers/upload/file.module';
import { FileServiceInterface } from '@/providers/upload/file-service.interface';
import { Inject, Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { compressImage } from './image-compress';
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
    if (!res.ok) return FAIL(`resizing failed: ${res.errMessage}`, 400);
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

  /**
   * resizes in a worker thread when the compiled worker (dist/.../cWorker.js) exists,
   * otherwise (ts-node / jest: only cWorker.ts exists) or if the worker fails, in process
   */
  public async resizeSinglePicW(file: Buffer): Promise<Resp<Buffer>> {
    const workerFile = path.join(__dirname, 'cWorker.js');
    if (!__filename.endsWith('.js') || !fs.existsSync(workerFile)) {
      return this.resizeSinglePic(file);
    }
    try {
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const worker = new Worker(workerFile);
        const done = (fn: () => void) => {
          fn();
          worker.terminate().catch(() => undefined);
        };
        worker.once('message', (data: ImageResizeResponse) => {
          if (data && 'buffer' in data && data.buffer) {
            done(() => resolve(Buffer.from(data.buffer)));
          } else {
            done(() => reject(new Error(data?.error || 'resize failed')));
          }
        });
        worker.once('error', (err) => done(() => reject(err)));
        worker.once('exit', (code) => {
          if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
        worker.postMessage({ file });
      });
      return Succeed(buffer);
    } catch (e) {
      logTrace('resize worker failed, resizing in process', e.message, ColorEnums.FgYellow);
      return this.resizeSinglePic(file);
    }
  }

  //==========================   UNUSED ====================
  //========================================================

  // resizing image (in process)
  public async resizeSinglePic(file: Buffer): Promise<Resp<Buffer>> {
    if (!file) return FAIL('no image found');
    try {
      return Succeed(await compressImage(file));
    } catch (e) {
      return FAIL(e.message);
    }
  }
}
