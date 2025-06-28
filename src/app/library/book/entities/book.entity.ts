import { Document } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ApiProperty } from '@nestjs/swagger';

import { EmbedUpload } from '@/app/upload/upload.entity';
import { ItemStatus } from '@/common/types/enums';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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
  categoryName: string;

  @IsNotEmpty()
  @Prop({ type: [{ type: String, ref: 'Genre.name' }] })
  genres: string[];

  //===========================   File Related ===============
  @Prop({ type: EmbedUpload })
  upload: EmbedUpload;

  @IsOptional()
  @IsString()
  @Prop({
    type: String,
    enum: Object.values(ItemStatus),
  })
  status: ItemStatus;

  @IsOptional()
  // @Prop({ type: String, unique: true, sparse: true })//TODO: uncomment this on production
  @Prop({ type: String })
  fileId?: string;

  //======================   end file related

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

  @IsOptional()
  @Prop({ type: Number, required: false })
  publishDate?: number;

  @IsOptional()
  @IsString()
  @Prop({ type: String })
  authorName: string;

  /**
   * the books we have(instances)donations & count of books available
   */
  @Prop({ type: Number, required: false, default: 0 })
  instanceCnt: number;

  @IsOptional()
  @IsString()
  @Prop({ type: Number, required: false, default: 0 })
  availableCnt: number; //the amount of books left in the library

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

export const BookFilter: (keyof Book)[] = [
  'title',
  'authorName',
  'fileId',
  'authorName',
  '_id',
  'status',
  'language',
  'categoryName',
  'active',
  'pageNo',
];
