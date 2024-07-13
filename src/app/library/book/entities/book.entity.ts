import mongoose, { Document } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ApiQuery, ApiProperty } from '@nestjs/swagger';

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EmbedUpload, UploadDto } from '@/app/upload/upload.entity';

export enum BookLanguage {
  English = 'English',
  Amharic = 'Amharic',
  AffanOrommo = 'AfanOromo',
  Tigrna = 'Tigrna',
}

@Schema({ timestamps: true })
export class Book {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @Prop({ type: String, unique: true, sparse: true })
  slug: string;

  /**
   * this is an auto increment id for books for easy identification & tracking;
   */
  @IsOptional()
  @Prop({ type: String, unique: true, spares: true })
  uid?: number;

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
  @Prop({ type: String, required: true, ref: 'Category' })
  categoryId: string;

  @IsNotEmpty()
  @Prop({ type: [{ type: String, ref: 'Genre.name' }] })
  genres: string[];

  @Prop({ type: EmbedUpload })
  upload: EmbedUpload;

  @IsOptional()
  @Prop({ type: String, unique: true, sparse: true })
  fileId?: string;

  @IsOptional()
  @IsString()
  @Prop({
    type: String,
    enum: Object.values(BookLanguage),
  })
  language: BookLanguage;

  @IsOptional()
  @Prop({ type: Number, required: false })
  pageNo?: number;

  @IsString()
  @IsOptional()
  @Prop({ type: String, required: false, ref: 'User' })
  authorId: string;

  @IsOptional()
  @IsString()
  @Prop({ type: String })
  authorName: string;

  /**
   * the books we have(instances)donations & count of books available
   */
  @Prop({ type: Number, required: false, default: 0 })
  instanceCnt: number;

  /**
   *
   * the amount of books left in the library
   */
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
