import mongoose, { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EmbedUpload, UploadDto } from '@/app/upload/upload.entity';

@Schema()
export class Category {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @IsString()
  @IsNotEmpty()
  @Prop({ type: String, unique: true })
  name: string;

  @Prop({ type: UploadDto, _id: false })
  img: UploadDto;

  @Prop({ type: EmbedUpload })
  upload: EmbedUpload;

  @Prop({ type: String, unique: true, sparse: true })
  slug: string;

  @Prop({ type: Number, required: false, default: 0 })
  count: number;

  @Prop({ type: Number, required: false, default: 10 })
  order: number;

  @IsOptional()
  @Prop({ type: String })
  desc?: string;

  @IsOptional()
  @Prop({ type: String, unique: true, sparse: true })
  fileId?: string;

  @IsOptional()
  @Prop({ type: String, select: false, required: false, default: false })
  restricted = false;
}

export type CategoryDocument = Category & Document;
export const CategorySchema = SchemaFactory.createForClass(Category);
// Create indexes
CategorySchema.index({ name: 'text' });
