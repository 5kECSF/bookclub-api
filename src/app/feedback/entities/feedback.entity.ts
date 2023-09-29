import mongoose, { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { User } from '../../users';

@Schema()
export class FeedBack {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @Prop({ type: String })
  title: string;

  @Prop({ type: String })
  email: string;

  @Prop({ type: String })
  body?: string;

  @Prop({ type: Types.ObjectId, required: true, ref: 'User' })
  userId: User['_id'];

  @Prop({ type: String })
  userName: string;

  @Prop({ type: Number, required: false, default: 0 })
  count: number;

  @Prop({ type: String, required: false, default: false })
  read: boolean;
}

export type Feedback = FeedBack & Document;
export const FeedbackSchema = SchemaFactory.createForClass(FeedBack);
// Create indexes
FeedbackSchema.index({ title: 'text' });
