import { ApiHideProperty, PartialType, PickType } from '@nestjs/swagger';

import { EmbedUpload } from '@/app/upload/upload.entity';
import { PaginationInputs } from '@/common/types/common.types.dto';
import { OmitType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { Category } from './category.entity';
export class CategoryInput extends PickType(Category, [
  'name',
  'desc',
  'restricted',
  'fileId',
  'status',
]) {
  @IsString()
  @IsOptional()
  @ApiHideProperty()
  slug?: string;

  @ApiHideProperty()
  @IsOptional()
  upload?: EmbedUpload;
}

export class UpdateCategoryDto extends PartialType(OmitType(CategoryInput, ['slug'])) {}

export class CategoryQuery extends PaginationInputs {
  @IsOptional()
  searchText?: string;

  @IsOptional()
  restricted?: boolean = false;

  // ======== Pagination fields
  @IsOptional()
  sort?: string = 'count';
}
export const CategoryFilter: (keyof Category)[] = ['name', 'status', 'fileId', '_id'];
