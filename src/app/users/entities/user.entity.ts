import { Document } from 'mongoose';

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ApiHideProperty } from '@nestjs/swagger';

import { RoleType } from '../imports.user';

import { ACCOUNT_STATUS, GENDER } from '../../profile/dto/profile.dto';
import { ImageObj } from '../../file/file.dto';

export const emailRegex = /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/;

@Schema({ timestamps: true })
export class User {
  // @Prop({
  //   get: (id: string) => {
  //     return id
  //   },
  // })
  readonly _id: string;

  @Prop({ type: String, unique: true, sparse: true })
  email: string;

  @Prop({ type: String, unique: true, sparse: true })
  phone: string;

  @Prop({ type: String, unique: true, sparse: true })
  userName: string;

  @Prop({ type: String })
  firstName: string;

  @Prop({ type: String })
  lastName: string;

  fullName?: string;

  @Prop({ type: String, select: false })
  @ApiHideProperty()
  password: string;

  @Prop({ type: ImageObj, _id: false })
  avatar: ImageObj;

  @Prop({
    type: String,
    enum: Object.values(RoleType),
    default: RoleType.USER,
  })
  role: RoleType = RoleType.USER;

  @ApiHideProperty()
  @Prop({ type: String, select: false })
  hashedRefreshToken: string;

  @Prop({ type: String, select: false, required: false })
  @ApiHideProperty()
  verificationCodeHash: string;

  @Prop({ select: false, required: false })
  @ApiHideProperty()
  verificationCodeExpires: number;

  //profile related
  @Prop({ type: [{ type: String, ref: 'Book._id' }] })
  likedBooks: string[];

  @Prop({ type: [{ type: String, ref: 'Book._id' }] })
  dislikedBooks: string[];

  @Prop({ required: false })
  donatedCount: number;

  /**
   * used when updating old email
   */
  @ApiHideProperty()
  @Prop({ required: false })
  newEmail: string;

  @Prop({ type: String, required: false })
  active: boolean;

  /**
   * These are properties for account setup
   */

  @Prop({ required: false })
  idImage?: string;

  @Prop({
    type: String,
    enum: Object.values(ACCOUNT_STATUS),
  })
  accountStatus: ACCOUNT_STATUS;

  @Prop({
    type: String,
    enum: Object.values(GENDER),
  })
  gender?: GENDER;
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
// Create indexes
UserSchema.index({ phone: 'text', email: 'text' });

// Hook before insert or save

UserSchema.pre('save', setDefaultFullName);

UserSchema.virtual('id').get(function () {
  return this._id;
});

async function setDefaultFullName(this: User, next) {
  try {
    if (this.firstName && !this.fullName) {
      this.fullName = this.firstName + ' ' + this.lastName;
    }
    return next();
  } catch (error) {
    return next(error);
  }
}
