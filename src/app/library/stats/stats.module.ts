import { UsersModule } from '@/app/account/users';
import { GuardsModule } from '@/providers/guards/guards.module';
import { Module } from '@nestjs/common';
import { NotificationModule } from '../../extra/notification/notification.module';
import { BookModule } from '../book/book.module';
import { BorrowModule } from '../borrow/borrow.module';
import { DonationModule } from '../donation/donation.module';
import { StatsController } from './stats.controller';

@Module({
  imports: [
    BorrowModule,
    GuardsModule,
    UsersModule,
    BookModule,
    NotificationModule,
    DonationModule,
  ],
  controllers: [StatsController],
  providers: [],
  exports: [],
})
export class StatsModule {}
