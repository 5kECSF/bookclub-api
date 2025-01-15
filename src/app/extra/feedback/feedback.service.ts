import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import { FeedBack, FeedBackDocument } from './entities/feedback.entity';

import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import mongoose, { Model } from 'mongoose';

@Injectable()
export class FeedbackService extends MongoGenericRepository<FeedBack> {
  constructor(
    @InjectModel(FeedBack.name) private tagModel: Model<FeedBackDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {
    super(tagModel);
  }
}
