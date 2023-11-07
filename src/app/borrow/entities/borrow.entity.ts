import mongoose, { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Donation } from '../../donation/entities/donation.entity';
import { Book } from '../../book/entities/book.entity';

export enum BorrowStatus {
  Borrowed = 'BORROWED',
  WaitList = 'WAITLIST',
  Accepted = 'ACCEPTED',
  Returned = 'RETURNED',
}

@Schema({ timestamps: true })
export class Borrow {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: String })
  userId: string;

  @IsOptional()
  @Prop({ type: String })
  userName?: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: Types.ObjectId, required: true, ref: 'Book' })
  bookId: Book['_id'];

  @IsOptional()
  @IsString()
  @Prop({ type: String, required: false, ref: 'Donation' })
  uid?: Donation['uid'];

  @IsOptional()
  @Prop({ type: Number, required: false })
  instanceNo?: number;

  @IsOptional()
  @Prop({ type: String })
  bookName?: string;

  //requested date is got from timestamp
  @Prop({ type: Date, required: false })
  takenDate?: Date; //Created Date

  @Prop({ type: Date, required: false })
  returnedDate?: Date;

  @Prop({ type: Date, required: false })
  dueDate?: Date;

  @IsOptional()
  @IsString()
  @Prop({ type: String, enum: Object.values(BorrowStatus), default: BorrowStatus.WaitList })
  status?: BorrowStatus;
}

export type BorrowDocument = Borrow & Document;
export const BorrowSchema = SchemaFactory.createForClass(Borrow);
// Create indexes
BorrowSchema.index({ name: 'text' });
