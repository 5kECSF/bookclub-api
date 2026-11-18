import { ApiHideProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';

import { EmbedUpload } from '@/app/upload/upload.entity';
import { PaginationInputs } from '@/common/types/common.types.dto';
import { toBoolTransform } from '@/common/util/object-functions';
import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';
import { Book, BookLanguage } from './book.entity';

export class CreateBookInput extends PickType(Book, [
  'title',
  'desc',
  'status',
  'categoryName',
  'genres',
  'meta',
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

export class UpdateBookDto extends PartialType(OmitType(CreateBookInput, ['slug', 'uid'])) {
  @IsOptional()
  @Transform(toBoolTransform)
  fileUpdated?: boolean;
}

export class BookQuery extends PaginationInputs {
  @IsOptional()
  genres?: string[];

  @IsOptional()
  meta?: string[];

  @IsOptional()
  categoryId?: string;

  @IsOptional()
  language?: BookLanguage;

  @IsOptional()
  authorId?: string;

  /**
   * true  -> only books with available copies (availableCnt > 0)
   * false / absent -> no availability filter
   * (it used to default to `true` and the string "false" was truthy, so books without
   * available copies -e.g. new ones- could never be listed, not even by admins)
   */
  @IsOptional()
  @Transform(toBoolTransform)
  inStore?: boolean;
}
