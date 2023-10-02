import mongoose, { Document, Types } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

import { User } from '../../users';
import { ImageObj } from '../../file/file.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@Schema({ timestamps: true })
export class Book {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @Prop({ type: String, unique: true, sparse: true })
  slug: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: String })
  title: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: String })
  desc: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: Types.ObjectId, required: true, ref: 'Category' })
  categoryId: string;

  @IsNotEmpty()
  @Prop({ type: [{ type: String, ref: 'Genre.name' }] })
  genres: string[];

  @Prop({ type: ImageObj })
  img?: ImageObj;

  @IsOptional()
  @IsString()
  @Prop({ required: false })
  language?: string;

  @IsOptional()
  @Prop({ type: Number, required: false })
  pageNo?: number;

  @IsString()
  @IsOptional()
  @Prop({ type: Types.ObjectId, required: false, ref: 'User' })
  authorId: User['_id'];

  @IsOptional()
  @IsString()
  @Prop({ type: String })
  authorName: string;

  /**
   * the books we have(instances) & count of books available
   */
  @Prop({ type: Number, required: false, default: 0 })
  instanceCount: number;

  @IsOptional()
  @IsString()
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
