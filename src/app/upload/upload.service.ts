import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Upload, UploadBody, UploadDocument, UploadDto } from './upload.entity';

import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import { Model } from 'mongoose';
import { FAIL, Resp, Succeed } from '@/common/constants/return.consts';
import { FileProviderService } from '@/app/upload/file-provider.service';
import { logTrace } from '@/common/logger';
import { removeSubArr } from '@/common/util/functions';
import { RoleType, UserFromToken } from '@/common/common.types.dto';

@Injectable()
export class UploadService extends MongoGenericRepository<Upload> {
  constructor(
    @InjectModel(Upload.name) private uploadModel: Model<UploadDocument>,
    private fileService: FileProviderService,
  ) {
    super(uploadModel);
  }

  public async UploadSingle(
    file: Express.Multer.File,
    userId: string,
    uid = '',
    ctr = 0,
  ): Promise<Resp<UploadDto>> {
    if (!file) return FAIL('File Must not be empty', 400);
    const imgName = this.fileService.generateUniqName(file.originalname, uid, ctr);
    const uploaded = await this.fileService.IUploadSingleImage(file.buffer, imgName.name);
    if (!uploaded.ok) return FAIL(uploaded.errMessage, uploaded.code);

    const upload = await this.createOne({ ...uploaded.val, userId, uid: imgName.uid });
    if (!upload.ok) throw new HttpException(upload.errMessage, upload.code);

    // logTrace('val', data);
    // logTrace('val', uploaded.val);
    return Succeed(upload.val);
  }

  public async UpdateSingle(
    file: Express.Multer.File,
    query,
    userId: string,
  ): Promise<Resp<UploadDto>> {
    if (!file) return FAIL('Image Must not be empty', 400);

    const oldFile = await this.findOne(query);
    if (!oldFile.ok) throw new HttpException(oldFile.errMessage, oldFile.code);
    logTrace('oldFile', oldFile.val);
    const resp = await this.fileService.IDeleteImageByPrefix(oldFile.val.fileName);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    const uploaded = await this.fileService.IUploadWithNewName(file, oldFile.val.uid);
    if (!uploaded.ok) return FAIL(uploaded.errMessage, uploaded.code);

    //TODO: update the upload hash and size
    const upload = await this.updateById(oldFile.val._id, {
      ...uploaded.val,
      userId,
    });
    if (!upload.ok) throw new HttpException(upload.errMessage, upload.code);
    // upload.val.fullImg = uploaded.val.fullImg;
    return Succeed(upload.val);
  }

  /**
   * this is used by model one that uploads an image & multiple images
   * @param files
   * @param userId
   */
  public async UploadWithCover(
    files: {
      cover?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
    userId: string,
  ): Promise<Resp<UploadDto>> {
    if (!files.cover || files.cover.length < 1) return FAIL('Image Must not be empty');

    const single = await this.UploadSingle(files.cover[0], userId);
    if (!single.ok) return single;
    logTrace('upload single finished', single.val._id);
    if (files.images) {
      const images = await this.uploadManyWithNewNames(files.images, userId, single.val.uid);
      if (!images.ok) return FAIL(images.errMessage, images.code);
      await this.updateById(single.val._id, { images: images.val });
      single.val.images = images.val;
    }
    return Succeed(single.val);
  }

  /**
   * this is used by model one that uploads an image & multiple images
   * @param files
   * @param id
   * @param user
   * @param updateDto
   */
  public async UpdateWithCover(
    files: {
      cover?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
    id: string,
    user: UserFromToken,
    updateDto: UploadBody,
  ): Promise<Resp<UploadDto>> {
    const query = { _id: id };
    if (user.role != RoleType.ADMIN) {
      query['userId'] = user._id;
    }
    logTrace('update dto', updateDto);
    const primaryFile = await this.findOne(query);
    if (!primaryFile.ok) return FAIL(primaryFile.errMessage, primaryFile.code);

    let newImages = primaryFile.val.images || [];

    /**
     * if images have been removed
     */
    if (updateDto?.removedImages && updateDto.removedImages.length > 0) {
      if (!Array.isArray(updateDto.removedImages))
        updateDto.removedImages = [...updateDto.removedImages];

      const removed = [];

      await Promise.all(
        updateDto.removedImages.map(async (fileName, i) => {
          //check if the image to be removed exists inside the primary's images list
          if (newImages.includes(fileName)) {
            const result = await this.deleteFileByQuery({ fileName });
            if (!result.ok) throw new HttpException(result.errMessage, result.code);
            removed.push(fileName);
          }
        }),
      );
      //remove the deleted images from the new Images list
      newImages = removeSubArr(newImages, removed);
    }

    // if the primary image have been updated
    if (files.cover && files.cover.length > 0) {
      logTrace('Updating Cover', files.cover.length);
      const result = await this.UpdateSingle(
        files.cover[0],
        { fileName: updateDto.fileName },
        user._id,
      );
    }

    /**
     * If Images have been added
     */
    if (files.images && files.images.length > 0) {
      //this is checking from the updated primaryFiles list so it is right
      const tot = files.images.length + newImages.length;
      if (tot > 3) throw new HttpException('Image Numbers Exceeded max image size', 400);
      const images = await this.uploadManyWithNewNames(files.images, user._id, primaryFile.val.uid);
      if (!images.ok) return FAIL(images.errMessage, images.code);
      newImages = [...newImages, ...images.val];
    }
    // update the images array of hte primary image
    const imageObj = await this.updateById(primaryFile.val._id, {
      images: newImages,
    });
    if (!imageObj.ok) throw new HttpException(imageObj.errMessage, imageObj.code);
    return imageObj;
  }

  public async uploadManyWithNewNames(
    files: Express.Multer.File[],
    userId: string,
    uid = '',
  ): Promise<Resp<string[]>> {
    const names = [];
    try {
      await Promise.all(
        files.map(async (file, i) => {
          const data = await this.UploadSingle(file, userId, uid, i);
          if (!data.ok) return FAIL('failed uploading multi images, in a loop');
          names.push(data.val.fileName);
        }),
      );
      return Succeed(names);
    } catch (e) {
      return FAIL(e.message);
    }
  }

  public async deleteFileByQuery(query) {
    const file = await this.findOne(query);
    if (!file.ok) throw new HttpException(file.errMessage, file.code);

    const resp = await this.fileService.IDeleteImageByPrefix(file.val.fileName);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    const upload = await this.findByIdAndDelete(file.val._id);
    if (!upload.ok) throw new HttpException(upload.errMessage, upload.code);
    return upload;
  }
}
