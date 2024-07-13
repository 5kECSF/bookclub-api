import { ApiHideProperty, ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';

import { IsOptional, IsString } from 'class-validator';
import { PaginationInputs } from '@/common/common.types.dto';

import { bookStatus, Donation } from './donation.entity';

import { UploadDto } from '@/app/upload/upload.entity';

export class CreateDonationInput extends PickType(Donation, [
  'bookId',
  'donorId',
  'status',
  'desc',
]) {
  @ApiHideProperty()
  @IsOptional()
  donorName: string;

  @ApiHideProperty()
  @IsOptional()
  uid: string;

  @ApiHideProperty()
  @IsOptional()
  bookName: string;

  @ApiHideProperty()
  @IsOptional()
  bookImg: UploadDto;

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
