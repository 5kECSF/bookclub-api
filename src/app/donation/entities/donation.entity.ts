import mongoose, { Document, Types } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ApiHideProperty, ApiProperty } from '@nestjs/swagger';

import { User } from '../../users';
import { Prop as MProp } from '@nestjs/mongoose/dist/decorators/prop.decorator';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Book } from '../../book/entities/book.entity';
import { ImageObj } from '../../file/file.dto';

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
  @Prop({ type: String, unique: true, spares: true })
  uid?: string;

  @IsNotEmpty()
  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  donorId: User['_id'];

  @IsNotEmpty()
  @Prop({ type: Types.ObjectId, required: true, ref: 'Book' })
  bookId: Book['_id'];

  @IsOptional()
  @Prop({ type: String })
  donorName: string;

  @IsString()
  @IsOptional()
  @Prop({ type: String })
  bookName: string;

  @IsOptional()
  @Prop({ type: String })
  desc: string;

  @IsOptional()
  @Prop({ type: ImageObj })
  bookImg?: ImageObj;

  /**
   * the count of this specific book, instance Number
   */
  @IsOptional()
  @Prop({ type: Number, required: false, default: 0 })
  instanceNo?: number;

  @MProp({
    type: String,
    enum: Object.values(bookStatus),
  })
  @IsOptional()
  status: bookStatus;

  /**
   * To check who is in posesion of this book
   */
  @IsOptional()
  @Prop({ type: Types.ObjectId, required: false, ref: 'User' })
  borrowerId?: User['_id'];

  @IsOptional()
  @Prop({ type: String })
  borrowerName?: string;
}

export type DonationDocument = Donation & Document;
export const DonationSchema = SchemaFactory.createForClass(Donation);
// Create indexes
DonationSchema.index({ body: 'text' });
