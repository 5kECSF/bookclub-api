import { EmbedUpload } from '@/app/upload/upload.entity';
import { PaginationInputs } from '@/common/types/common.types.dto';
import { ItemStatus } from '@/common/types/enums';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiHideProperty, ApiProperty, OmitType, PartialType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Document } from 'mongoose';
@Schema({ timestamps: true, versionKey: false })
export class Author {
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
  info?: string;

  @Prop({ type: String, unique: true, sparse: true })
  slug: string;

  //===========================   File Related ===============

  @Prop({ type: String })
  coverImage?: string;

  @Prop({ type: EmbedUpload })
  upload: EmbedUpload;

  @IsOptional()
  @IsString()
  @Prop({
    type: String,
    enum: Object.values(ItemStatus),
  })
  status: ItemStatus;

  @IsOptional()
  @Prop({ type: String, unique: true, sparse: true })
  fileId?: string;
  //======================   end file related ==========

  @Prop({ type: Number, required: false, default: 0 })
  bookCount: number;
}

export type AuthorDocument = Author & Document;
export const AuthorSchema = SchemaFactory.createForClass(Author);
// Create indexes
AuthorSchema.index({ name: 'text' });

export class CreateAuthorInput extends OmitType(Author, ['_id', 'slug']) {
  @IsOptional()
  @ApiHideProperty()
  slug?: string;

  @ApiHideProperty()
  @IsOptional()
  upload: EmbedUpload;
}

export class UpdateDto extends PartialType(OmitType(CreateAuthorInput, ['slug'])) {}

export class AuthorQuery extends PaginationInputs {
  // ======== Pagination fields
  @IsOptional()
  sort?: string = 'name';
}

export const AuthorFilter: (keyof Author)[] = ['name', 'status', 'fileId', '_id'];
