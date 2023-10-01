import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import { Borrow, BorrowDocument } from './entities/borrow.entity';

import { MongoGenericRepository } from './imports.borrow';
import mongoose, { Model } from 'mongoose';

@Injectable()
export class BorrowService extends MongoGenericRepository<Borrow> {
  constructor(
    @InjectModel(Borrow.name) private tagModel: Model<BorrowDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {
    super(tagModel);
  }
}
