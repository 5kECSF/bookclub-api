import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiHideProperty } from '@nestjs/swagger';
import { Prop, Schema } from '@nestjs/mongoose';

@Schema()
export class ImageObj {
  @IsNotEmpty()
  @IsString()
  @Prop({ type: String })
  image?: string;

  @IsOptional()
  @Prop({ type: [{ type: String }] })
  images?: string[];

  @Prop({ type: String })
  @IsString()
  uid?: string;

  /**
   * depricated names
   */
  @Prop({ type: String })
  @IsString()
  fullImg?: string;

  @IsNotEmpty()
  @IsString()
  imagePath?: string;

  @IsString()
  @IsOptional()
  @ApiHideProperty()
  suffix?: string;
}
