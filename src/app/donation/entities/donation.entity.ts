import mongoose, { Document, Types } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

import { User } from '../../users';
import { Prop as MProp } from '@nestjs/mongoose/dist/decorators/prop.decorator';

export enum bookStatus {
  Available = 'AVAILABLE',
  borrowed = 'BORROWED',
}

@Schema({ timestamps: true })
export class Donation {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  donorId: User['_id'];

  @Prop({ type: String })
  donorName: string;

  @Prop({ type: String })
  bookName: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Book' })
  bookId: string;

  /**
   * the count of this specific book
   */
  @Prop({ type: Number, required: false, default: 0 })
  bookNum: number;

  @MProp({
    type: String,
    enum: Object.values(bookStatus),
  })
  status: bookStatus;
}

export type DonationDocument = Donation & Document;
export const DonationSchema = SchemaFactory.createForClass(Donation);
// Create indexes
DonationSchema.index({ body: 'text' });
