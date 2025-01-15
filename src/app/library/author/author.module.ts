import { UploadModule } from '@/app/upload/upload.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthorController } from './author.controller';
import { Author, AuthorSchema } from './author.entity';
import { AuthorService } from './author.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Author.name, schema: AuthorSchema }]), UploadModule],
  controllers: [AuthorController],
  providers: [AuthorService],
  exports: [AuthorService],
})
export class AuthorModule {}
