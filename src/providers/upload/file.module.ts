// file-service.provider.ts
import { Global, Module, Provider } from '@nestjs/common';
import { EnvVar } from '../../common/config/config.instances';
import { CloudinaryService } from './cloudinary';
import { FileServiceInterface } from './file-service.interface';
import { LocalStorageService } from './local-storage.service';
import { S3Service } from './s3.service';
export const FILE_SERVICE = 'FILE_SERVICE';

export const STORAGE_PROVIDERS = ['CLOUDINARY', 'S3_PROVIDER', 'LOCAL'];

export const fileServiceProvider: Provider = {
  provide: FILE_SERVICE,
  useFactory: (): FileServiceInterface => {
    const provider = EnvVar.getInstance.STORAGE_PROVIDER;
    switch (provider) {
      case 'CLOUDINARY':
        return new CloudinaryService();
      case 'S3_PROVIDER':
        return new S3Service();
      case 'LOCAL':
        return new LocalStorageService();
      default:
        throw new Error(
          `Unknown storage provider: '${provider}' (STORAGE_PROVIDER must be one of ${STORAGE_PROVIDERS.join(
            ', ',
          )})`,
        );
    }
  },
};

@Global()
@Module({
  providers: [fileServiceProvider],
  exports: [fileServiceProvider],
})
export class FileModule {}
