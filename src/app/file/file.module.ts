import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileController } from './file.controller';

import { GuardsModule } from '../../providers/guards/guards.module';
import { EmailModule } from '../../providers/email';
import { FileUploadProvider } from '../../providers/upload';

@Module({
  imports: [GuardsModule, EmailModule],
  controllers: [FileController],
  providers: [FileService, FileUploadProvider],
  exports: [FileService],
})
export class FileModule {}
