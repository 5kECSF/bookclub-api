import { ApiHideProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { PaginationInput } from '../imports.borrow';
import { IsOptional, IsString } from 'class-validator';
import { Borrow } from './borrow.entity';

export class CreateBorrowInput extends OmitType(Borrow, ['_id']) {}

export class RequestBorrowInput extends PickType(Borrow, ['bookId', 'userName', 'bookName']) {
  @IsOptional()
  @ApiHideProperty()
  userId?: string;
}

export class UpdateDto extends PartialType(CreateBorrowInput) {}

export class BorrowQuery extends PaginationInput {
  @IsOptional()
  searchText?: string;

  // ======== Pagination fields
  @IsOptional()
  sort?: string = 'count';
}
