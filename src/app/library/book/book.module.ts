import { Module, forwardRef } from '@nestjs/common';
import { BookService } from './book.service';
import { BookController } from './book.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Book, BookSchema } from './entities/book.entity';
import { UsersModule } from '@/app/account/users';

import { GuardsModule } from '@/providers/guards/guards.module';
import { CategoryModule } from '../category/category.module';
import { GenreModule } from '../genres/genre.module';
import { UploadModule } from '@/app/upload/upload.module';
import { Sequence, SequenceModel, SequenceService } from './sequence/sequence.entity';
import { DonationModule } from '../donation/donation.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Book.name, schema: BookSchema }]),
    MongooseModule.forFeature([{ name: Sequence.name, schema: SequenceModel }]),
    UsersModule,
    GuardsModule,
    CategoryModule,
    GenreModule,
    UploadModule,
    forwardRef(() => DonationModule),
  ],
  controllers: [BookController],
  providers: [BookService, SequenceService],
  exports: [BookService],
})
export class BookModule {}
