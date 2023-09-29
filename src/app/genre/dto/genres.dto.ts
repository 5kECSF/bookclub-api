import { ApiHideProperty, OmitType, PartialType } from '@nestjs/swagger';
import { PaginationInput, RoleType } from '../imports.genre';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateGenreInput {
  @IsNotEmpty()
  @IsString()
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

export class UpdateDto extends PartialType(CreateGenreInput) {}

export class GenreQuery extends PaginationInput {
  @IsOptional()
  searchText?: string;

  @IsOptional()
  restricted?: boolean = false;

  // ======== Pagination fields
  @IsOptional()
  sort?: string = 'count';
}
