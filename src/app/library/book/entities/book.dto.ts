import { ApiHideProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationInputs } from '@/common/common.types.dto';
import { Book, BookLanguage } from './book.entity';
import { EmbedUpload, UploadDto } from '@/app/upload/upload.entity';

export class CreateBookInput extends PickType(Book, [
  'title',
  'desc',
  'categoryId',
  'genres',
  'authorId',
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
