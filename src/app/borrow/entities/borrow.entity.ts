import mongoose, { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { IsOptional, IsString } from 'class-validator';

export enum BorrowStatus {
  Borrowed = 'BORROWED',
  QUE = 'QUE',
  Available = 'AVAILABLE',
}

@Schema({ timestamps: true })
export class Borrow {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @Prop({ type: String })
  userId: string;

  @Prop({ type: String })
  userName: string;

  @Prop({ type: Number, required: false })
  instanceNo: number;

  @Prop({ type: String })
  bookName?: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'Book' })
  bookId: string;

  @Prop({ type: Date, required: false })
  takenDate: Date; //Created Date

  @Prop({ type: Date, required: false })
  returnedDate?: Date;

  @Prop({ type: Date, required: false })
  endDate?: Date;

  @IsOptional()
  @IsString()
  @Prop({ type: String, enum: Object.values(BorrowStatus), default: BorrowStatus.Available })
  status?: BorrowStatus;
}

export type BorrowDocument = Borrow & Document;
export const BorrowSchema = SchemaFactory.createForClass(Borrow);
// Create indexes
BorrowSchema.index({ name: 'text' });
