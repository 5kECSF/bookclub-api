import { ApiHideProperty, PartialType, PickType } from '@nestjs/swagger';
import { PaginationInput, RoleType } from '../category.dependencies';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OmitType } from '@nestjs/swagger';
import { Category } from './category.entity';
import { EmbedUpload } from '@/app/upload/upload.entity';

export class CategoryInput extends PickType(Category, ['name', 'desc', 'restricted', 'fileId']) {
  @IsString()
  @IsOptional()
  @ApiHideProperty()
  slug?: string;

  @ApiHideProperty()
  @IsOptional()
  upload?: EmbedUpload;
}

export class UpdateCategoryDto extends PartialType(OmitType(CategoryInput, ['slug'])) {}

export class CategoryQuery extends PaginationInput {
  @IsOptional()
  searchText?: string;

  @IsOptional()
  restricted?: boolean = false;

  // ======== Pagination fields
  @IsOptional()
  sort?: string = 'count';
}
