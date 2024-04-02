import { Module } from '@nestjs/common';
import { BorrowService } from './borrow.service';
import { BorrowController } from './borrow.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Borrow, BorrowSchema } from './entities/borrow.entity';
import { UsersModule } from '@/app/account/users';
import { BookModule } from '../book/book.module';
import { NotificationModule } from '../../extra/notification/notification.module';
import { DonationModule } from '../donation/donation.module';
import { GuardsModule } from '@/providers/guards/guards.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Borrow.name, schema: BorrowSchema }]),
    GuardsModule,
    UsersModule,
    BookModule,
    NotificationModule,
    DonationModule,
  ],
  controllers: [BorrowController],
  providers: [BorrowService],
  exports: [BorrowService],
})
export class BorrowModule {}
