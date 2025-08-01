import { PaginationInputs } from '@/common/types/common.types.dto';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiHideProperty, OmitType, PartialType, PickType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Document } from 'mongoose';
export enum UploadModel {
  Category = 'Category',
  Genre = 'Genre',
  Book = 'Book',
  Author = 'Author',
  Donation = 'Donation',
  NotAssigned = 'NotAssigned',
}

export enum UploadStatus {
  Draft = 'draft',
  Uploaded = 'uploaded',
  Active = 'active',
}

@Schema({ timestamps: true })
export class Upload {
  _id: string;

  @Prop({ type: String })
  userId?: string;

  /**
   * this is the same for group of images, aka groupId
   */
  @Prop({ type: String })
  @IsString()
  uid?: string;

  /**
   * FILE_NAME: this the actual images name, which is put on firebase, it could be empyt when draft
   */
  @Prop({ type: String, unique: true, sparse: true })
  @IsString()
  fileName: string;

  /**
   * this is the name to the path ie, P1
   */
  @IsNotEmpty()
  @Prop({ type: String })
  pathId?: string;

  @IsOptional()
  @IsString()
  @Prop({
    type: String,
    enum: Object.values(UploadModel),
    default: UploadModel.NotAssigned,
  })
  model?: UploadModel;

  @IsOptional()
  @IsString()
  @Prop({
    type: String,
    enum: Object.values(UploadStatus),
    default: UploadStatus.Draft,
  })
  status?: UploadStatus;

  @Prop({ type: String })
  refId?: string; //this is the parent images id for non primary images

  @IsOptional()
  @ApiHideProperty()
  suffix?: string;

  @IsOptional()
  @Prop({ type: [{ type: String }], default: undefined }) //default is undefined because child images dont have images
  images?: string[];

  //===========  other fields
  @Prop({ type: String })
  hash?: string;

  @Prop({ type: Boolean, default: true })
  isPrimary?: boolean;

  /**
   * URL < Full path of the image, it is what is returned to the user includes all the prefix and suffix
   */
  @Prop({ type: String })
  url: string;
}

export class UpdateDto extends PartialType(OmitType(Upload, ['_id'])) {}

export type UploadDocument = Upload & Document;
export const UploadSchema = SchemaFactory.createForClass(Upload);

// Upload Dto is saved inside the img object of the models
@Schema({ _id: false })
export class UploadDto extends PickType(Upload, [
  'fileName',
  'suffix',
  'pathId',
  'url',
  'uid',
  'images',
  'status',
]) {
  @Prop({ type: String })
  _id?: string;
}
//this is the model embeded in the other models
@Schema({ _id: false })
export class EmbedUpload {
  @Prop({ type: String })
  _id?: string; //this is put in the image's model

  @Prop({ type: String })
  @IsString()
  fileName: string; // this is also put in the images model

  @Prop({ type: String })
  @IsNotEmpty()
  @IsString()
  url: string; // this is also put in the images model

  @IsNotEmpty()
  @Prop({ type: String })
  pathId?: string; //this is also put in the images model

  @Prop({ type: String })
  @IsString()
  uid?: string; //for delete purposes we could, query the whole image

  @IsOptional()
  @Prop({ type: [{ type: String }], default: undefined })
  images?: string[];
}
export class UpdateBody {
  @IsOptional()
  removedImages?: string[];
}

export class UploadQuery extends PaginationInputs {
  @IsOptional()
  fileName?: string;

  @IsOptional()
  uid?: string;

  @IsOptional()
  isPrimary?: boolean;

  @IsOptional()
  userId?: string;
}

export const UploadFilter: (keyof Upload)[] = [
  'fileName',
  'model',
  'refId',
  'hash',
  'isPrimary',
  'pathId',
  'uid',
  'url',
  'userId',
  'status',
  '_id',
];
