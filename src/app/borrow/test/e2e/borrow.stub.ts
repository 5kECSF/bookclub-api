import { CreateBorrowInput, UpdateDto } from '../../entities/borrow.dto';

export const mockBorrow: CreateBorrowInput = {
  bookId: 'some id',
  userId: 'some id',
  takenDate: undefined,
};

export const mockUpdateBorrow: UpdateDto = { takenDate: undefined };
