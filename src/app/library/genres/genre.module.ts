import { Module } from '@nestjs/common';
import { GenreService } from './genre.service';
import { GenreController } from './genre.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Genre, GenreSchema } from './entities/genre.entity';
import { UploadModule } from '@/app/upload/upload.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Genre.name, schema: GenreSchema }]), UploadModule],
  controllers: [GenreController],
  providers: [GenreService],
  exports: [GenreService],
})
export class GenreModule {}
