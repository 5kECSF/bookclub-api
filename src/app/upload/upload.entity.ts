import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiHideProperty, OmitType, PickType } from '@nestjs/swagger';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { PaginationInput } from '@/app/extra/feedback/feedback.dependencies';

@Schema({ timestamps: true })
export class Upload {
  _id: string;

  @Prop({ type: Types.ObjectId })
  userId?: string;

  /**
   * this is the same for group of images, aka groupId
   */
  @Prop({ type: String })
  @IsString()
  uid?: string;

  /**
   * FILE_NAME: this the actual images name, which is put on firebase,
   * ie, userId/
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
  @ApiHideProperty()
  suffix?: string;

  @IsOptional()
  @Prop({ type: [{ type: String }], default: undefined })
  images?: string[];

  //===========  other fields
  @Prop({ type: String })
  hash?: string;

  @Prop({ type: Boolean, default: true })
  isPrimary?: boolean;

  /**
   * URL < Full path of the image, it is what is returned to the user includes all the prefix and suffix
   */
  @IsOptional()
  @Prop({ type: String })
  url?: string;
}

export class UploadDt extends OmitType(Upload, ['_id']) {}

export type UploadDocument = Upload & Document;
export const UploadSchema = SchemaFactory.createForClass(Upload);

// Upload Dto is saved inside the img object of the models
@Schema({ _id: false })
export class UploadDto extends PickType(Upload, ['fileName', 'suffix', 'pathId', 'uid', 'images']) {
  @Prop({ type: String })
  _id?: string;

  url?: string;
}
@Schema({ timestamps: true })
export class EmbedUpload {
  @Prop({ type: String })
  _id?: string;

  @Prop({ type: String, unique: true, sparse: true })
  @IsString()
  fileName: string;

  @IsNotEmpty()
  @Prop({ type: String })
  pathId?: string;

  @Prop({ type: String })
  @IsString()
  uid?: string;

  @IsOptional()
  @Prop({ type: [{ type: String }], default: undefined })
  images?: string[];
}
export class UploadBody {
  @IsOptional()
  fileName?: string;

  @IsOptional()
  removedImages?: string[];
}

export class UploadQuery extends PaginationInput {
  @IsOptional()
  fileName?: string;

  @IsOptional()
  uid?: string;

  @IsOptional()
  isPrimary?: boolean;

  @IsOptional()
  userId?: string;
}
