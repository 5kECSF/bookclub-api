import { ApiHideProperty, PartialType } from '@nestjs/swagger';

import { PaginationInputs } from '@/common/types/common.types.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FeedBack } from '../entities/feedback.entity';
export class CreateFeedbackInput {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  body?: string;

  @IsOptional()
  @ApiHideProperty()
  userId?: string;

  @IsOptional()
  fullName?: string;

  @IsNotEmpty()
  @IsString()
  email?: string;
}

export class UpdateFeedbackDto extends PartialType(CreateFeedbackInput) {
  @IsOptional()
  seen?: boolean;
}

export class FeedbackQuery extends PaginationInputs {
  @IsOptional()
  seen?: boolean = false;
}
export const FeedbackFilter: (keyof FeedBack)[] = [
  'count',
  '_id',
  'userName',
  'userId',
  'email',
  'read',
  'body',
];
