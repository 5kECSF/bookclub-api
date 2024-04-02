import { Module } from '@nestjs/common';
import { AuthorService } from './author.service';
import { AuthorController } from './author.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Author, AuthorSchema } from './entities/author.entity';
import { UploadModule } from '@/app/upload/upload.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Author.name, schema: AuthorSchema }]), UploadModule],
  controllers: [AuthorController],
  providers: [AuthorService],
  exports: [AuthorService],
})
export class AuthorModule {}
