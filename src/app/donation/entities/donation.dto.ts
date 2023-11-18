import { ApiHideProperty, ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';

import { IsOptional, IsString } from 'class-validator';
import { PaginationInputs } from '../../../common/common.types.dto';

import { bookStatus, Donation } from './donation.entity';

import { User } from '../../users';

export class CreateDonationInput extends PickType(Donation, [
  'status',
  'bookId',
  'desc',
  'uid',
  //below will be set from the model
  'donorName',
  'bookName',
  'bookImg',
]) {
  @IsOptional()
  @IsString()
  donorId: User['_id'];

  @ApiHideProperty()
  @IsOptional()
  instanceNo?: number;
}

export class UpdateDonationDto extends PartialType(CreateDonationInput) {}

export class DonationQuery extends PaginationInputs {
  @IsOptional()
  donorId: string;

  @IsOptional()
  bookId: string;

  @IsOptional()
  status: bookStatus;
}
