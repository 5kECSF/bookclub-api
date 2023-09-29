import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import { Notification, NotificationDocument } from './entities/notification.entity';

import { MongoGenericRepository } from './notification.dependencies';
import mongoose, { Model } from 'mongoose';

@Injectable()
export class NotificationService extends MongoGenericRepository<Notification> {
  constructor(
    @InjectModel(Notification.name) private tagModel: Model<NotificationDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {
    super(tagModel);
  }
}
