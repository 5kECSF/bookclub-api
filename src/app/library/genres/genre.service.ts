import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import { Genre, GenreDocument } from './entities/genre.entity';

import { MongoGenericRepository } from './imports.genre';
import mongoose, { Model } from 'mongoose';

@Injectable()
export class GenreService extends MongoGenericRepository<Genre> {
  constructor(
    @InjectModel(Genre.name) private tagModel: Model<GenreDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {
    super(tagModel);
  }
}
