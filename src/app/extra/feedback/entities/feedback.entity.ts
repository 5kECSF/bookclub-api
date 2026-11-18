import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class FeedBack {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @Prop({ type: String })
  title: string;

  @Prop({ type: String })
  email: string;

  @Prop({ type: String })
  body?: string;

  @Prop({ type: String, required: true, ref: 'User' })
  userId: string;

  @Prop({ type: String })
  userName: string;

  @Prop({ type: Number, required: false, default: 0 })
  count: number;

  @Prop({ type: Boolean, required: false, default: false })
  read: boolean;

  // `seen` is what UpdateFeedbackDto/FeedbackQuery use; it was silently dropped (not in the schema)
  @Prop({ type: Boolean, required: false, default: false })
  seen: boolean;
}

export type FeedBackDocument = FeedBack & Document;
export const FeedbackSchema = SchemaFactory.createForClass(FeedBack);
// Create indexes
FeedbackSchema.index({ title: 'text' });
