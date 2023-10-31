import { ApiHideProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { PaginationInput, RoleType } from '../imports.author';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ImageObj } from '../../file/file.dto';

import { Author } from '../entities/author.entity';

export class CreateAuthorInput extends PickType(Author, ['name', 'info']) {
  @IsOptional()
  @ApiHideProperty()
  slug?: string;

  @ApiHideProperty()
  @IsOptional()
  img?: ImageObj;
}

export class UpdateDto extends PartialType(PickType(Author, ['name', 'info'])) {}

export class AuthorQuery extends PaginationInput {
  // ======== Pagination fields
  @IsOptional()
  sort?: string = 'name';
}
