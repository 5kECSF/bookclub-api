import { ApiHideProperty, OmitType, PartialType } from '@nestjs/swagger';
import { PaginationInput } from '../imports.borrow';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { BorrowStatus } from '../entities/borrow.entity';

export class CreateBorrowInput {
  @IsString()
  @IsNotEmpty()
  userId?: string;

  @IsNotEmpty()
  @IsString()
  bookId?: string;

  @IsNotEmpty()
  @IsString()
  userName?: string;

  @IsNotEmpty()
  @IsString()
  bookName?: string;

  @IsOptional()
  takenDate: Date;

  @IsOptional()
  endDate?: Date;

  @IsOptional()
  @IsString()
  status?: BorrowStatus;
}

export class UpdateDto extends PartialType(CreateBorrowInput) {}

export class GenreQuery extends PaginationInput {
  @IsOptional()
  searchText?: string;

  @IsOptional()
  restricted?: boolean = false;

  // ======== Pagination fields
  @IsOptional()
  sort?: string = 'count';
}
