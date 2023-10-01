import { ApiHideProperty, ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';

import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaginationInputs } from '../../../common/common.types.dto';

import { bookStatus, Donation } from '../entities/donation.entity';

export class CreateDonationInput extends PickType(Donation, [
  'donorId',
  'donorName',
  'bookId',
  'instanceNo',
  'status',
]) {}

export class UpdateDonationDto extends PartialType(CreateDonationInput) {}

export class DonationQuery extends PaginationInputs {
  @IsOptional()
  donorId: string;

  @IsOptional()
  bookId: string;

  @IsOptional()
  status: bookStatus;
}
