import { Module } from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { FeedbackController } from './feedback.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { FeedBack, FeedbackSchema } from './entities/feedback.entity';
import { GuardsModule, UsersModule } from '../auth/dependencies.auth';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: FeedBack.name, schema: FeedbackSchema }]),
    UsersModule,
    GuardsModule,
  ],
  controllers: [FeedbackController],
  providers: [FeedbackService],
  exports: [FeedbackService],
})
export class FeedbackModule {}
