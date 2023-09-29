import { PartialType } from '@nestjs/swagger';
import { PaginationInput } from '../notification.dependencies';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateNotificationInput {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  body?: string;

  @IsOptional()
  type?: NotificationEnum;

  @IsOptional()
  to?: string;
}

export class UpdateDto extends PartialType(CreateNotificationInput) {}

export class NotificationQuery extends PaginationInput {
  @IsOptional()
  searchText?: string;

  @IsOptional()
  to?: string;

  @IsOptional()
  type?: NotificationEnum;
}

export enum NotificationEnum {
  General = 'General',
  Individual = 'Individual',
}
