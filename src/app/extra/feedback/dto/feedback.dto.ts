import { ApiHideProperty, PartialType } from '@nestjs/swagger';

import { PaginationInputs } from '@/common/types/common.types.dto';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { toBoolTransform } from '@/common/util/object-functions';
import { Transform } from 'class-transformer';
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

  // defaults to the logged in user's email
  @IsOptional()
  @IsString()
  email?: string;
}

export class UpdateFeedbackDto extends PartialType(CreateFeedbackInput) {
  @IsOptional()
  @Transform(toBoolTransform)
  seen?: boolean;
}

export class FeedbackQuery extends PaginationInputs {
  @IsOptional()
  @Transform(toBoolTransform)
  seen?: boolean;
}
export const FeedbackFilter: (keyof FeedBack)[] = [
  'count',
  '_id',
  'userName',
  'userId',
  'email',
  'read',
  'seen',
  'body',
];
