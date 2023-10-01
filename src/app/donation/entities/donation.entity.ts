import mongoose, { Document, Types } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

import { User } from '../../users';
import { Prop as MProp } from '@nestjs/mongoose/dist/decorators/prop.decorator';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export enum bookStatus {
  Available = 'AVAILABLE',
  borrowed = 'BORROWED',
}

@Schema({ timestamps: true })
export class Donation {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @IsNotEmpty()
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  donorId: User['_id'];

  @IsOptional()
  @Prop({ type: String })
  donorName: string;

  @IsString()
  @Prop({ type: String })
  bookName: string;

  @IsOptional()
  @Prop({ type: Types.ObjectId, required: true, ref: 'Book' })
  bookId: string;

  /**
   * the count of this specific book, instance Number
   */
  @IsOptional()
  @Prop({ type: Number, required: false, default: 0 })
  instanceNo: number;

  @MProp({
    type: String,
    enum: Object.values(bookStatus),
  })
  @IsOptional()
  status: bookStatus;
}

export type DonationDocument = Donation & Document;
export const DonationSchema = SchemaFactory.createForClass(Donation);
// Create indexes
DonationSchema.index({ body: 'text' });
