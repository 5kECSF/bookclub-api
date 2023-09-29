import { ApiHideProperty, ApiProperty, OmitType, PartialType } from '@nestjs/swagger';

import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { PaginationInputs } from '../../../common/common.types.dto';

import { bookStatus } from '../entities/donation.entity';

export class CreateDonationInput {
  @IsNotEmpty()
  @IsString()
  donorId: string;

  @IsString()
  @IsOptional()
  donorName?: string;

  @IsNotEmpty()
  @IsString()
  bookId: string;

  @IsString()
  @IsOptional()
  bookName?: string;

  /**
   * the count of this specific book
   */
  @IsNumber()
  @IsOptional()
  bookNum: number;

  @IsOptional()
  status: bookStatus;
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
