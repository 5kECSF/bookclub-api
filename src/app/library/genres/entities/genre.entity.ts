import { Document } from 'mongoose';
import { ApiHideProperty, ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { EmbedUpload, UploadDto } from '@/app/upload/upload.entity';
import { PaginationInput } from '@/app/library/genres/imports.genre';

@Schema({ timestamps: true, versionKey: false })
export class Genre {
  @ApiProperty({ name: 'id' })
  @Expose({ name: 'id' })
  readonly _id: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: String, unique: true })
  name: string;

  @IsOptional()
  @IsString()
  @Prop({ type: String })
  desc?: string;

  @Prop({ type: String, unique: true, sparse: true })
  slug: string;

  @Prop({ type: Number, required: false, default: 0 })
  count: number;

  @Prop({ type: String })
  coverImage?: string;

  @Prop({ type: EmbedUpload })
  upload: EmbedUpload;

  @IsOptional()
  @Prop({ type: String, unique: true, sparse: true })
  fileId?: string;

  @Prop({ type: String, select: false, required: false, default: false })
  restricted? = false;
}

export type GenreDocument = Genre & Document;
export const GenreSchema = SchemaFactory.createForClass(Genre);
// Create indexes
GenreSchema.index({ name: 'text' });

export class CreateGenreInput extends PickType(Genre, ['name', 'desc', 'restricted', 'fileId']) {
  @IsOptional()
  @ApiHideProperty()
  slug?: string;

  @ApiHideProperty()
  @IsOptional()
  upload?: EmbedUpload;
}

export class UpdateDto extends PartialType(OmitType(CreateGenreInput, ['slug'])) {}

export class GenreQuery extends PaginationInput {
  @IsOptional()
  searchText?: string;

  @IsOptional()
  restricted?: boolean = false;

  // ======== Pagination fields
  @IsOptional()
  sort?: string = 'count';
}
