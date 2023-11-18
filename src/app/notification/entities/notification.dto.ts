import { OmitType, PartialType } from '@nestjs/swagger';
import { PaginationInput } from '../notification.dependencies';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Notification, NotificationEnum } from './notification.entity';

export class CreateNotificationInput extends OmitType(Notification, ['_id']) {}

export class UpdateDto extends PartialType(CreateNotificationInput) {}

export class NotificationQuery extends PaginationInput {
  @IsOptional()
  to?: string;

  @IsOptional()
  type?: NotificationEnum;
}
