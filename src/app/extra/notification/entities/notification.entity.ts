import mongoose, { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { User } from '../../../account/users';

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum NotificationEnum {
  General = 'General',
  Individual = 'Individual',
}

@Schema({ timestamps: true })
export class Notification {
  @ApiProperty({ name: 'id' })
  readonly _id: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: String })
  title: string;

  @IsNotEmpty()
  @Prop({ type: String })
  body?: string;

  @IsOptional()
  @Prop({
    type: String,
    enum: Object.values(NotificationEnum),
    default: NotificationEnum.General,
  })
  type?: NotificationEnum; //general, single user

  @IsOptional()
  @Prop({ type: String, required: false, ref: 'User' })
  userId: string;
}

export type NotificationDocument = Notification & Document;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
// Create indexes
NotificationSchema.index({ name: 'text' });
