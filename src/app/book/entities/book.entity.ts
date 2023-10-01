import mongoose, { Document, Types } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

import { User } from '../../users';
import { ImageObj } from '../../file/file.dto';

@Schema({ timestamps: true })
export class Book {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @Prop({ type: String, unique: true, sparse: true })
  slug: string;

  @Prop({ type: String })
  title: string;

  @Prop({ type: String })
  desc: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  authorId: User['_id'];

  @Prop({ type: String })
  authorName: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Category' })
  categoryId: string;

  @Prop({ type: [{ type: String, ref: 'Genre.name' }] })
  genres: string[];

  image?: ImageObj;

  @Prop({ type: String })
  coverImage?: string;

  @Prop({ required: false })
  language?: string;

  @Prop({ type: Number, required: false })
  pageNo: number;

  /**
   * the books we have(instances) & count of books available
   */
  @Prop({ type: Number, required: false, default: 0 })
  instanceCount: number;

  @Prop({ type: Number, required: false, default: 0 })
  availableCnt: number;

  @Prop({ type: Number, required: false, default: 0 })
  likesCount: number;

  @Prop({ type: Number, required: false, default: 0 })
  dislikesCount: number;

  @Prop({ type: String, select: false, required: false })
  active: boolean;
}

export type BookDocument = Book & Document;
export const BookSchema = SchemaFactory.createForClass(Book);
// Create indexes
BookSchema.index({ title: 'text', desc: 'text' });
