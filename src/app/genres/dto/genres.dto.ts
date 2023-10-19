import { ApiHideProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { PaginationInput, RoleType } from '../imports.genre';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ImageObj } from '../../file/file.dto';
import { Prop } from '@nestjs/mongoose';
import { Genre } from '../entities/genre.entity';

export class CreateGenreInput extends PickType(Genre, ['name','desc', 'restricted']) {

  @IsOptional()
  @ApiHideProperty()
  slug?: string;

  @ApiHideProperty()
  @IsOptional()
  img?: ImageObj;
}

export class UpdateDto extends PartialType(PickType(Genre, ['name','desc', 'restricted'])) {}

export class GenreQuery extends PaginationInput {
  @IsOptional()
  searchText?: string;

  @IsOptional()
  restricted?: boolean = false;

  // ======== Pagination fields
  @IsOptional()
  sort?: string = 'count';
}
