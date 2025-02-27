import { ApiHideProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';

import { EmbedUpload } from '@/app/upload/upload.entity';
import { PaginationInputs } from '@/common/types/common.types.dto';
import { IsOptional, IsString } from 'class-validator';
import { Book, BookLanguage } from './book.entity';

export class CreateBookInput extends PickType(Book, [
  'title',
  'desc',
  'status',
  'categoryName',
  'genres',
  'authorName',
  'language',
  'pageNo',
  'fileId',
  // 'availableCnt',
]) {
  // @IsOptional()
  // coverImage?: string;
  // image?: ImageObj;
  /**
   * back end only fields ===============
   */
  @IsString()
  @IsOptional()
  @ApiHideProperty()
  slug?: string;

  @IsOptional()
  @ApiHideProperty()
  uid?: number;

  @ApiHideProperty()
  @IsOptional()
  upload?: EmbedUpload;
}
export class ActivateBookInput {
  @IsString()
  fileId: string;
}

export class UpdateBookDto extends PartialType(OmitType(CreateBookInput, ['slug'])) {
  @IsOptional()
  fileUpdated = false;
}

export class BookQuery extends PaginationInputs {
  @IsOptional()
  genres?: string[];

  @IsOptional()
  categoryId?: string;

  @IsOptional()
  language?: BookLanguage;

  @IsOptional()
  authorId?: string;
}
