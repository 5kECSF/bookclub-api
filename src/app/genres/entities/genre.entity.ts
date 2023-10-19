import mongoose, { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';
import { ImageObj } from '../../file/file.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

@Schema({ timestamps: true, versionKey: false })
export class Genre {
  @ApiProperty({ name: 'id' })
  @Expose({ name: 'id' })
  readonly _id: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: String, unique: true })
  name: string;

  @IsOptional()
  @IsString()
  @Prop({ type: String })
  desc?: string;

  @Prop({ type: String, unique: true, sparse: true })
  slug: string;

  @Prop({ type: ImageObj, _id: false })
  img: ImageObj;

  @Prop({ type: Number, required: false, default: 0 })
  count: number;

  @Prop({ type: String })
  coverImage?: string;

  @Prop({ type: String, select: false, required: false, default: false })
  restricted? = false;
}

export type GenreDocument = Genre & Document;
export const GenreSchema = SchemaFactory.createForClass(Genre);
// Create indexes
GenreSchema.index({ name: 'text' });
