import { Module } from '@nestjs/common';
import { BorrowService } from './borrow.service';
import { BorrowController } from './borrow.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Borrow, BorrowSchema } from './entities/borrow.entity';
import { GuardsModule, UsersModule } from '../auth/dependencies.auth';
import { BookModule } from '../book/book.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Borrow.name, schema: BorrowSchema }]),
    GuardsModule,
    UsersModule,
    BookModule,
    NotificationModule,
  ],
  controllers: [BorrowController],
  providers: [BorrowService],
  exports: [BorrowService],
})
export class BorrowModule {}
