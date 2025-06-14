import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import { Author, AuthorDocument } from './author.entity';

import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import mongoose, { Model } from 'mongoose';

@Injectable()
export class AuthorService extends MongoGenericRepository<Author> {
  constructor(
    @InjectModel(Author.name) private tagModel: Model<AuthorDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {
    super(tagModel, []);
  }
}
