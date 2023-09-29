import mongoose, { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

@Schema()
export class Category {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @Prop({ type: String, unique: true })
  name: string;

  @Prop({ type: String, unique: true, sparse: true })
  slug: string;

  @Prop({ type: Number, required: false, default: 0 })
  count: number;

  @Prop({ type: String })
  desc?: string;

  @Prop({ type: String, select: false, required: false, default: false })
  restricted = false;
}

export type CategoryDocument = Category & Document;
export const CategorySchema = SchemaFactory.createForClass(Category);
// Create indexes
CategorySchema.index({ name: 'text' });
