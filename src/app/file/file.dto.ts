import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiHideProperty } from '@nestjs/swagger';
import { Prop, Schema } from '@nestjs/mongoose';

@Schema()
export class ImageObj {
  @IsNotEmpty()
  @IsString()
  @Prop({ type: String })
  image?: string;

  @Prop({ type: String })
  @IsString()
  imageId?: string;

  @Prop({ type: String })
  @IsString()
  imageName: string;

  @IsNotEmpty()
  @IsString()
  imagePath?: string;

  @IsString()
  @IsOptional()
  @ApiHideProperty()
  suffix: string;
}
