import { ApiHideProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';

import { PaginationInputs } from '@/common/types/common.types.dto';
import { IsOptional } from 'class-validator';
import { Borrow } from './borrow.entity';
export class CreateBorrowInput extends OmitType(Borrow, ['_id']) {}

export class RequestBorrowInput extends PickType(Borrow, ['bookId', 'userName', 'bookName']) {
  @IsOptional()
  @ApiHideProperty()
  userId?: string;
}

export class UpdateDto extends PartialType(CreateBorrowInput) {}

export class BorrowQuery extends PaginationInputs {
  @IsOptional()
  searchText?: string;

  @IsOptional()
  overDue?: boolean;

  // ======== Pagination fields
  @IsOptional()
  sort?: string = 'count';
}
export const BorrowFilter: (keyof Borrow)[] = [
  'bookId',
  'bookName',
  'status',
  '_id',
  'dueDate',
  'instanceId',
  'instanceUid',
  'returnedDate',
  'takenDate',
  'userId',
  'userName',
];
