import { OmitType, PartialType, ApiHideProperty } from '@nestjs/swagger';
import { PaginationInput, RoleType } from '../feedback.dependencies';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

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

export class FeedbackQuery extends PaginationInput {
  @IsOptional()
  seen?: boolean = false;
}
