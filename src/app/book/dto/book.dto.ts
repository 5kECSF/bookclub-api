import { ApiHideProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationInputs } from '../../../common/common.types.dto';
import { Book } from '../entities/book.entity';
import { ImageObj } from '../../file/file.dto';

export class CreateBookInput extends PickType(Book, [
  'title',
  'desc',
  'categoryId',
  'genres',
  'authorId',
  'authorName',
  'language',
  'pageNo',
  'availableCnt',
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
  img?: ImageObj;
}

export class UpdateBookDto extends PartialType(OmitType(CreateBookInput, ['slug'])) {}

export class BookQuery extends PaginationInputs {
  @IsOptional()
  searchText?: string;

  @IsOptional()
  genres?: string[];

  @IsOptional()
  categoryId?: string;

  @IsOptional()
  language?: string;

  @IsOptional()
  authorId?: string;
}
