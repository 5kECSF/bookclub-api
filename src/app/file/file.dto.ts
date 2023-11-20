import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiHideProperty } from '@nestjs/swagger';
import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class ImageObj {
  @IsNotEmpty()
  @IsString()
  @Prop({ type: String })
  image?: string;

  @IsOptional()
  @Prop({ type: [{ type: String }], default: undefined })
  images?: string[];

  @Prop({ type: String })
  @IsString()
  uid?: string;

  @IsNotEmpty()
  @IsString()
  @Prop({ type: String })
  path?: string;

  /**
   * depricated names
   */

  @IsString()
  fullImg?: string;
}
