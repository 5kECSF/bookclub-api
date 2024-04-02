import { Module } from '@nestjs/common';
import { DonationService } from './donation.service';
import { DonationController } from './donation.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Donation, DonationSchema } from './entities/donation.entity';
import { User, UserSchema, UsersModule } from '../../account/users';

import { GuardsModule } from '@/providers/guards/guards.module';
import { BookModule } from '../book/book.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Donation.name, schema: DonationSchema }]),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    GuardsModule,
    UsersModule,
    BookModule,
  ],
  controllers: [DonationController],
  providers: [DonationService],
  exports: [DonationService],
})
export class DonationModule {}
