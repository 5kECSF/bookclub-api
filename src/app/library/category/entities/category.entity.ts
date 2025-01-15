import { EmbedUpload } from '@/app/upload/upload.entity';
import { ItemStatus } from '@/common/types/enums';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Document } from 'mongoose';

@Schema()
export class Category {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @IsString()
  @IsNotEmpty()
  @Prop({ type: String, unique: true })
  name: string;

  @IsOptional()
  @Prop({ type: String })
  desc?: string;

  // ===============   File Related ===============

  @Prop({ type: String })
  coverImage?: string;

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
  @Prop({ type: String, unique: true, sparse: true })
  fileId?: string;
  // ======================   end file related ==========

  @Prop({ type: String, unique: true, sparse: true })
  slug: string;

  @Prop({ type: Number, required: false, default: 0 })
  count: number;

  @Prop({ type: Number, required: false, default: 10 })
  order: number;

  @IsOptional()
  @Prop({ type: String, select: false, required: false, default: false })
  restricted = false;
}

export type CategoryDocument = Category & Document;
export const CategorySchema = SchemaFactory.createForClass(Category);
// Create indexes
CategorySchema.index({ name: 'text' });
