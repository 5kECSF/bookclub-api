import { Module } from '@nestjs/common';
import { GenreService } from './genre.service';
import { GenreController } from './genre.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Genre, GenreSchema } from './entities/genre.entity';
import { FileModule } from '../file/file.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Genre.name, schema: GenreSchema }]), FileModule],
  controllers: [GenreController],
  providers: [GenreService],
  exports: [GenreService],
})
export class GenreModule {}
