import { OmitType, PartialType } from '@nestjs/swagger';

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Notification, NotificationEnum } from './notification.entity';
import { PaginationInputs } from '@/common/types/common.types.dto';
export class CreateNotificationInput extends OmitType(Notification, ['_id']) {}

export class UpdateDto extends PartialType(CreateNotificationInput) {}

export class NotificationQuery extends PaginationInputs {
  @IsOptional()
  to?: string;

  @IsOptional()
  type?: NotificationEnum;
}
