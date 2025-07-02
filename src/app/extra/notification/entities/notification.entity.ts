import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { Document } from 'mongoose';

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum NotificationEnum {
  General = 'General',
  Individual = 'Individual',
}

export enum ToEnum {
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

  to: string;
}

export type NotificationDocument = Notification & Document;
export const NotificationSchema = SchemaFactory.createForClass(Notification);
// Create indexes
NotificationSchema.index({ name: 'text' });

export const NotificationFilter: (keyof Notification)[] = ['_id', 'userId', 'body', 'type'];
