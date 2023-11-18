import { Module } from '@nestjs/common';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Book, BookSchema } from './entities/book.entity';
import { UsersModule } from '../users/users.module';

import { GuardsModule } from '../../providers/guards/guards.module';
import { CategoryModule } from '../category/category.module';
import { GenreModule } from '../genres/genre.module';
import { FileModule } from '../file/file.module';
import { Sequence, SequenceModel, SequenceService } from './sequence/sequence.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Book.name, schema: BookSchema }]),
    MongooseModule.forFeature([{ name: Sequence.name, schema: SequenceModel }]),

    UsersModule,
    GuardsModule,
    CategoryModule,
    GenreModule,
    FileModule,
  ],
  controllers: [BookController],
  providers: [BookService, SequenceService],
  exports: [BookService],
})
export class BookModule {}
