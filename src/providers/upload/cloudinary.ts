import { UploadDto } from '@/app/upload/upload.entity';
import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { EnvVar } from '../../common/config/config.instances';
import { FAIL, Resp, Succeed } from '../../common/constants/return.consts';
import { ColorEnums, logTrace } from '../../common/logger';
import { FileServiceInterface } from './firebase';

// Configure Cloudinary with environment variables
// cloudinary.config({
//   cloud_name: EnvVar.getInstance.CLOUDINARY_CLOUD_NAME,
//   api_key: EnvVar.getInstance.CLOUDINARY_API_KEY,
//   api_secret: EnvVar.getInstance.CLOUDINARY_API_SECRET,
// });

@Injectable()
export class CloudinaryService implements FileServiceInterface {
  constructor() {
    // Configure Cloudinary in the constructor
    cloudinary.config({
      cloud_name: EnvVar.getInstance.CLOUDINARY_CLOUD_NAME,
      api_key: EnvVar.getInstance.CLOUDINARY_API_KEY,
      api_secret: EnvVar.getInstance.CLOUDINARY_API_SECRET,
    });
  }

  async UploadOne(fName: string, file: Buffer): Promise<Resp<UploadDto>> {
    try {
      // // Convert buffer to base64 string for Cloudinary upload
      // const fileBase64 = file.toString('base64');
      // const fileDataUri = `data:image/jpeg;base64,${fileBase64}`;
      // // Upload to Cloudinary
      // const result = await cloudinary.uploader.upload(file, {
      //   public_id: fName, // Use fName as the public_id
      //   resource_type: 'image',
      // });
      // logTrace('upload succeed', fName);
      // return Succeed({
      //   url: result.secure_url,
      //   suffix: '', // Cloudinary URLs don't need a suffix like Firebase
      //   pathId: result.public_id,
      //   fileName: fName,
      // });

      return new Promise((resolve) => {
        const stream = cloudinary.uploader.upload_stream(
          { public_id: fName, resource_type: 'image' },
          (error, result: UploadApiResponse) => {
            if (error) {
              console.error('Upload to Cloudinary failed:', error);
              return resolve(FAIL(error.message, 500));
            }

            console.log('Upload succeeded:', fName);
            return resolve(
              Succeed({
                url: result.secure_url,
                suffix: '',
                pathId: result.public_id,
                fileName: fName,
              }),
            );
          },
        );

        stream.end(file);
      });
    } catch (e) {
      return FAIL(e.message, 500);
    }
  }

  async deleteFileByPrefix(id: string): Promise<Resp<boolean>> {
    try {
      // Delete resources with the given prefix
      const result = await cloudinary.api.delete_resources_by_prefix(id);

      logTrace('successfully deleted images with prefix', result, ColorEnums.BgGreen);
      return Succeed(true);
    } catch (e) {
      return FAIL('failed to delete Cloudinary images', e.message);
    }
  }

  async deleteFileByName(fileName: string): Promise<Resp<boolean>> {
    try {
      // Delete specific image by public_id
      await cloudinary.uploader.destroy(fileName);

      logTrace('successfully deleted image', fileName);
      return Succeed(true);
    } catch (e) {
      console.error(`Failed to delete file: ${fileName}`, e.message);
      return FAIL('failed to delete Cloudinary image');
    }
  }
}
