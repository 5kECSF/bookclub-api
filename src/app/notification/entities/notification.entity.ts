import mongoose, { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from '../../users';
import { NotificationEnum } from '../dto/notification.dto';
import { RoleType } from '../../../common/common.types.dto';

@Schema({ timestamps: true })
export class Notification {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @Prop({ type: String })
  title: string;

  @Prop({ type: String })
  body?: string;

  @Prop({
    type: String,
    enum: Object.values(NotificationEnum),
    default: NotificationEnum.General,
  })
  type?: NotificationEnum; //general, single user

  @Prop({ type: Types.ObjectId, required: false, ref: 'User' })
  to: User['_id'];
}

export type NotificationDocument = Notification & Document;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
// Create indexes
NotificationSchema.index({ name: 'text' });
