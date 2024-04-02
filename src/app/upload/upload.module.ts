import { Module } from '@nestjs/common';
import { FileProviderService } from './file-provider.service';
import { UploadController } from './upload.controller';

import { GuardsModule } from '@/providers/guards/guards.module';
import { EmailModule } from '@/providers/email';
import { FileUploadProvider } from '../../providers/upload';
import { Upload, UploadSchema } from '@/app/upload/upload.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { UploadService } from '@/app/upload/upload.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Upload.name, schema: UploadSchema }]),
    GuardsModule,
    EmailModule,
  ],
  controllers: [UploadController],
  providers: [FileProviderService, FileUploadProvider, UploadService],
  exports: [FileProviderService, UploadService],
})
export class UploadModule {}
