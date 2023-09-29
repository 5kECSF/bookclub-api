import { Module } from '@nestjs/common';
import { BorrowService } from './borrow.service';
import { BorrowController } from './borrow.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Borrow, BorrowSchema } from './entities/borrow.entity';

@Module({
  imports: [MongooseModule.forFeature([{ name: Borrow.name, schema: BorrowSchema }])],
  controllers: [BorrowController],
  providers: [BorrowService],
  exports: [BorrowService],
})
export class BorrowModule {}
