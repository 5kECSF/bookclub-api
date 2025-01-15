import { Injectable } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import { Category, CategoryDocument } from './entities/category.entity';

import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import mongoose, { Model } from 'mongoose';

@Injectable()
export class CategoryService extends MongoGenericRepository<Category> {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectConnection() private readonly connection: mongoose.Connection,
  ) {
    super(categoryModel);
  }
}
