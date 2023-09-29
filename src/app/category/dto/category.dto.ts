import { ApiHideProperty, PartialType } from '@nestjs/swagger';
import { PaginationInput, RoleType } from '../category.dependencies';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { OmitType } from '@nestjs/swagger';

export class CategoryInput {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  @ApiHideProperty()
  slug?: string;

  @IsOptional()
  coverImage?: string;

  @IsOptional()
  restricted?: boolean;
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
