import { ApiHideProperty, PartialType, PickType } from '@nestjs/swagger';

import { PaginationInputs } from '@/common/types/common.types.dto';
import { IsOptional } from 'class-validator';

import { bookStatus, Donation } from './donation.entity';

import { EmbedUpload } from '@/app/upload/upload.entity';

export class CreateDonationInput extends PickType(Donation, [
  'bookId',
  'donorId',
  'status',
  'desc',
  'bookImg',
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
  bookImg: EmbedUpload;

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

export const DonationFilter: (keyof Donation)[] = [
  'bookId',
  'bookName',
  'borrowerId',
  'borrowerName',
  'donorId',
  'donorName',
  'instanceNo',
  'status',

  '_id',
];
