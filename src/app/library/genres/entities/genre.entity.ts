import { EmbedUpload } from '@/app/upload/upload.entity';
import { PaginationInputs } from '@/common/types/common.types.dto';
import { ItemStatus } from '@/common/types/enums';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiHideProperty, ApiProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Document } from 'mongoose';
@Schema({ timestamps: true, versionKey: false })
export class Genre {
  @ApiProperty({ name: 'id' })
  @Expose({ name: 'id' })
  readonly _id: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: String, unique: true })
  name: string;

  @IsNotEmpty()
  @Prop({ type: [{ type: String }] })
  category: string[];

  @IsOptional()
  @IsString()
  @Prop({ type: String })
  desc?: string;

  @Prop({ type: String, unique: true, sparse: true })
  slug: string;

  @Prop({ type: Number, required: false, default: 0 })
  count: number;

  // ===============   File Related ===============

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

  @Prop({ type: String, select: false, required: false, default: false })
  restricted? = false;
}

export type GenreDocument = Genre & Document;
export const GenreSchema = SchemaFactory.createForClass(Genre);
// Create indexes
GenreSchema.index({ name: 'text' });

export class CreateGenreInput extends PickType(Genre, [
  'name',
  'desc',
  'restricted',
  'fileId',
  'status',
  'category',
]) {
  @IsOptional()
  @ApiHideProperty()
  slug?: string;

  @ApiHideProperty()
  @IsOptional()
  upload?: EmbedUpload;
}

export const GenreFilter: (keyof Genre)[] = [
  'count',
  'status',
  'name',
  'fileId',
  'restricted',
  '_id',
  'category',
];

export class UpdateDto extends PartialType(OmitType(CreateGenreInput, ['slug'])) {}

export class GenreQuery extends PaginationInputs {
  @IsOptional()
  category: string;

  status: ItemStatus;

  @IsOptional()
  searchText?: string;

  @IsOptional()
  restricted?: boolean = false;

  // ======== Pagination fields
  @IsOptional()
  sort?: string = 'count';
}
