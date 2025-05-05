// garage-s3.service.ts
import { UploadDto } from '@/app/upload/upload.entity';
import { S3 } from '@aws-sdk/client-s3';
import { Injectable } from '@nestjs/common';
import { EnvVar } from '../../common/config/config.instances';
import { FAIL, Resp, Succeed } from '../../common/constants/return.consts';
import { ColorEnums, logTrace } from '../../common/logger';
import { FileServiceInterface } from './firebase';

@Injectable()
export class S3Service implements FileServiceInterface {
  private s3: S3;
  private bucket: string;

  constructor() {
    this.bucket = EnvVar.getInstance.S3_BUCKET;
    this.s3 = new S3({
      endpoint: EnvVar.getInstance.S3_ENDPOINT,
      region: EnvVar.getInstance.S3_REGION, // Garage doesn't require a region, but SDK needs a value
      credentials: {
        accessKeyId: EnvVar.getInstance.S3_ACCESS_KEY,
        secretAccessKey: EnvVar.getInstance.S3_SECRET_KEY,
      },
      forcePathStyle: true, // Required for Garage S3
    });
  }

  async UploadOne(fName: string, file: Buffer): Promise<Resp<UploadDto>> {
    try {
      const key = `images/${fName}`;
      await this.s3.putObject({
        Bucket: this.bucket,
        Key: key,
        Body: file,
        ContentType: 'image/*',
      });

      const url = `${EnvVar.getInstance.S3_ENDPOINT}/${this.bucket}/${key}`;
      logTrace('Upload to Garage S3 succeeded:', fName, ColorEnums.BgGreen);

      return Succeed({
        url,
        suffix: '',
        pathId: key,
        fileName: fName,
      });
    } catch (e) {
      console.error('Upload to Garage S3 failed:', e.message);
      return FAIL(e.message, 500);
    }
  }

  async deleteFileByPrefix(id: string): Promise<Resp<boolean>> {
    try {
      // List objects with prefix
      const objects = await this.s3.listObjectsV2({
        Bucket: this.bucket,
        Prefix: id,
      });

      if (objects.Contents?.length) {
        // Delete all objects with the prefix
        await this.s3.deleteObjects({
          Bucket: this.bucket,
          Delete: {
            Objects: objects.Contents.map((obj) => ({ Key: obj.Key })),
          },
        });
      }

      logTrace('Successfully deleted objects with prefix', id, ColorEnums.BgGreen);
      return Succeed(true);
    } catch (e) {
      console.error('Failed to delete Garage S3 objects:', e.message);
      return FAIL('Failed to delete Garage S3 objects', e.message);
    }
  }

  async deleteFileByName(fileName: string): Promise<Resp<boolean>> {
    try {
      await this.s3.deleteObject({
        Bucket: this.bucket,
        Key: `images/${fileName}`,
      });

      logTrace('Successfully deleted file', fileName, ColorEnums.BgGreen);
      return Succeed(true);
    } catch (e) {
      console.error('Failed to delete Garage S3 file:', e.message);
      return FAIL('Failed to delete Garage S3 file', e.message);
    }
  }
}
