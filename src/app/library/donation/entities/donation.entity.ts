import { Document } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ApiProperty } from '@nestjs/swagger';

import { Prop as MProp } from '@nestjs/mongoose/dist/decorators/prop.decorator';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum bookStatus {
  Available = 'AVAILABLE',
  NotAvailable = 'NOT_AVAILABLE', // if it is not borrowed but un available for another reason
  Taken = 'TAKEN',
  Reserved = 'RESERVED', // if it has been accepted to be borrowed
}

@Schema({ timestamps: true })
export class Donation {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  /**
   * this is the concation of book.uid-donation.instanceNo
   * @example '2-1'
   */
  @IsOptional()
  @Prop({ type: String, unique: true, sparse: true })
  uid?: string;

  /**
   * the count of this specific book, instance Number
   */
  @IsOptional()
  @Prop({ type: Number, required: false, default: 0 })
  instanceNo?: number;

  @IsNotEmpty()
  @Prop({ type: String, required: true, ref: 'User' })
  donorId: string;

  @IsNotEmpty()
  @Prop({ type: String, required: true, ref: 'Book' })
  bookId: string;

  @IsOptional()
  @Prop({ type: String })
  donorName: string;

  @IsString()
  @IsOptional()
  @Prop({ type: String })
  bookName: string;

  @IsOptional()
  @Prop({ type: String })
  note: string;

  @IsOptional()
  @Prop({ type: String })
  imgUrl?: string;

  @IsOptional()
  @Prop({ type: Date, required: false })
  donatedDate?: Date; //Created Date

  // new copies are available by default (no default meant they were never counted as available)
  @MProp({
    type: String,
    enum: Object.values(bookStatus),
    default: bookStatus.Available,
  })
  @IsOptional()
  @IsEnum(bookStatus)
  status: bookStatus;

  /**
   * To check who is in posesion of this book
   */
  @IsOptional()
  @Prop({ type: String, required: false, ref: 'User' })
  borrowerId?: string;

  @IsOptional()
  @Prop({ type: String })
  borrowerName?: string;
}

export type DonationDocument = Donation & Document;
export const DonationSchema = SchemaFactory.createForClass(Donation);
// Create indexes
DonationSchema.index({ body: 'text' });

/**
 * filter for copies that can be lent: legacy documents created before `status` had a default
 * have no status at all and are treated as available
 */
export const availableStatusFilter = { $in: [bookStatus.Available, null] };
