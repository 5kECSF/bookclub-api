import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Document } from 'mongoose';

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

  @IsOptional()
  @IsString()
  @Prop({ type: String, enum: Object.values(BorrowStatus), default: BorrowStatus.WaitList })
  status?: BorrowStatus;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: String, required: true, ref: 'User' })
  userId: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: String, required: true, ref: 'Book' })
  bookId: string;

  @IsOptional()
  @Prop({ type: String })
  userName?: string;

  @IsOptional()
  @Prop({ type: String, ref: 'Donation' })
  instanceId?: string;

  @IsOptional()
  @IsString()
  @Prop({ type: String, required: false, ref: 'Donation' })
  instanceUid?: string;

  @IsOptional()
  @Prop({ type: String })
  bookName?: string;

  @IsOptional()
  @Prop({ type: String })
  imgUrl?: string;

  @IsOptional()
  @Prop({ type: String })
  note?: string;
  //requested date is got from timestamp

  @IsOptional()
  @Prop({ type: Date, required: false })
  acceptedDate?: Date; //Created Date

  @IsOptional()
  @Prop({ type: Date, required: false })
  takenDate?: Date; //Created Date

  @IsOptional()
  @Prop({ type: Date, required: false })
  dueDate?: Date;

  @IsOptional()
  @Prop({ type: Date, required: false })
  returnedDate?: Date;
}

export type BorrowDocument = Borrow & Document;
export const BorrowSchema = SchemaFactory.createForClass(Borrow);
// Create indexes
BorrowSchema.index({ name: 'text' });

export class BorrowAccept {
  @IsOptional()
  note: string;

  @IsNotEmpty()
  instanceId: string;
}

export class BookTaken {
  @IsOptional()
  note: string;

  @IsNotEmpty()
  takenDate: Date;

  @IsNotEmpty()
  dueDate: Date;
}

export class BookReturned {
  @IsNotEmpty()
  returnedDate: string;
}
