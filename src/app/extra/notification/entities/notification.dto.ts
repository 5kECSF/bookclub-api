import { OmitType, PartialType } from '@nestjs/swagger';

import { PaginationInputs } from '@/common/types/common.types.dto';
import { IsOptional } from 'class-validator';
import { Notification, NotificationEnum, ToEnum } from './notification.entity';
export class CreateNotificationInput extends OmitType(Notification, ['_id']) {}

export class UpdateDto extends PartialType(CreateNotificationInput) {}

export class NotificationQuery extends PaginationInputs {
  @IsOptional()
  to?: ToEnum;

  @IsOptional()
  type?: NotificationEnum;

  @IsOptional()
  after?: Date;
}
