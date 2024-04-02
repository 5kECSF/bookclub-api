import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import { FeedBack, Feedback } from './entities/feedback.entity';

import { MongoGenericRepository } from './feedback.dependencies';
import mongoose, { Model } from 'mongoose';

@Injectable()
export class FeedbackService extends MongoGenericRepository<FeedBack> {
  constructor(
    @InjectModel(FeedBack.name) private tagModel: Model<Feedback>,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {
    super(tagModel);
  }
}
