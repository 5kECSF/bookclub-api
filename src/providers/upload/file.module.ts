// file-service.provider.ts
import { Global, Module, Provider } from '@nestjs/common';
import { EnvVar } from '../../common/config/config.instances';
import { CloudinaryService } from './cloudinary';
import { FileServiceInterface } from './firebase';
import { S3Service } from './s3.service';
export const FILE_SERVICE = 'FILE_SERVICE';

export const fileServiceProvider: Provider = {
  provide: FILE_SERVICE,
  useFactory: (): FileServiceInterface => {
    const provider = EnvVar.getInstance.STORAGE_PROVIDER;
    switch (provider) {
      case 'CLOUDINARY':
        return new CloudinaryService();
      case 'S3_PROVIDER':
        return new S3Service();
      default:
        throw new Error(`Unknown storage provider: ${provider}`);
    }
  },
};

@Global()
@Module({
  providers: [
    fileServiceProvider,
    CloudinaryService, // Still needed for factory instantiation
    S3Service, // Still needed for factory instantiation
  ],
  exports: [fileServiceProvider],
})
export class FileModule {}
