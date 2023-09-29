import { ApiHideProperty, OmitType, PartialType } from '@nestjs/swagger';

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PaginationInputs } from '../../../common/common.types.dto';

export class CreateBookInput {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  desc: string;

  @IsString()
  @IsOptional()
  @ApiHideProperty()
  authorId: string;

  @IsOptional()
  @IsString()
  authorName: string;

  @IsNotEmpty()
  @IsString()
  categoryId: string;

  @IsNotEmpty()
  genre: string[];

  // @IsOptional()
  // coverImage?: string;

  // image?: ImageObj;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  pageNo?: number;

  @IsOptional()
  @IsString()
  availableCnt?: number;

  /**
   * back end only fields ===============
   */
  @IsString()
  @IsOptional()
  @ApiHideProperty()
  slug?: string;
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
