import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { UpdateBody, Upload, UploadDocument, UploadDto } from './upload.entity';

import { FileProviderService } from '@/app/upload/file-provider.service';
import { RoleType, UserFromToken } from '@/common/common.types.dto';
import { FAIL, Resp, Succeed } from '@/common/constants/return.consts';
import { logTrace } from '@/common/logger';
import { generateUniqName, removeSubArr } from '@/common/util/functions';
import { MongoGenericRepository } from '@/providers/database/base/mongo.base.repo';
import { Model } from 'mongoose';

@Injectable()
export class UploadService extends MongoGenericRepository<Upload> {
  constructor(
    @InjectModel(Upload.name) private uploadModel: Model<UploadDocument>,
    private fileService: FileProviderService,
  ) {
    super(uploadModel);
  }

  //upload single takes file, the uid, userId then upload the file then save it to database
  public async UploadSingle(
    file: Express.Multer.File,
    userId: string,
    uid = '',
    ctr = 0,
  ): Promise<Resp<UploadDto>> {
    if (!file) return FAIL('File Must not be empty', 400);
    const imgName = generateUniqName(file.originalname, uid, ctr);
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
    //Find the old Image
    const oldFile = await this.findOne(query);
    if (!oldFile.ok) throw new HttpException(oldFile.errMessage, oldFile.code);
    // Delete The old Image File
    const resp = await this.fileService.IDeleteImageByPrefix(oldFile.val.fileName);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    // Create a new image
    const uploaded = await this.fileService.IUploadWithNewName(file, oldFile.val.uid);
    if (!uploaded.ok) return FAIL(uploaded.errMessage, uploaded.code);
    //update the images details on the database
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
    updateDto: UpdateBody,
  ): Promise<Resp<UploadDto>> {
    const query = { _id: id };
    if (user?.role != RoleType.ADMIN) {
      query['userId'] = user._id;
    }
    logTrace('update dto', updateDto);
    const primaryFile = await this.findOne(query);
    if (!primaryFile.ok) return FAIL(primaryFile.errMessage, primaryFile.code);

    let imagesList = primaryFile.val.images || [];

    /**
     * if images have been removed
     */
    if (updateDto?.removedImages && updateDto.removedImages.length > 0) {
      logTrace('images to be removed===', updateDto.removedImages);
      //the following line is helpful if the removedImages is not written as removedImages[]
      // if it is a single one and not in form of removedImages[]  it will become string instad of array
      if (!Array.isArray(updateDto.removedImages))
        updateDto.removedImages = [updateDto.removedImages];
      logTrace('images to be removed', updateDto.removedImages);
      const removed = [];

      await Promise.all(
        updateDto.removedImages.map(async (fileName, i) => {
          //check if the image to be removed exists inside the primary's images list
          if (imagesList.includes(fileName)) {
            const result = await this.deleteFileByQuery({ fileName });
            if (!result.ok) throw new HttpException(result.errMessage, result.code);
            removed.push(fileName);
          }
        }),
      );
      // logTrace('removed images are', removed);
      //remove the deleted images from the new Images list
      imagesList = removeSubArr(imagesList, removed);
      // logTrace('new images are', imagesList);
    }

    // if the primary image have been updated
    if (files.cover && files.cover.length > 0) {
      logTrace('Updating Cover', files.cover.length);
      const result = await this.UpdateSingle(
        files.cover[0],
        { _id: primaryFile.val._id },
        user._id,
      );
    }

    /**
     * If Images have been added
     */
    if (files.images && files.images.length > 0) {
      //this is checking from the updated primaryFiles list so it is right
      const tot = files.images.length + imagesList.length;
      if (tot > 3) throw new HttpException('Image Numbers Exceeded max image size', 400);
      const images = await this.uploadManyWithNewNames(files.images, user._id, primaryFile.val.uid);
      if (!images.ok) return FAIL(images.errMessage, images.code);
      imagesList = [...imagesList, ...images.val];
    }
    // update the images array of hte primary image
    const imageObj = await this.updateById(primaryFile.val._id, {
      images: imagesList,
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
    if (!file.ok) return FAIL(file.errMessage, file.code);

    if (file?.val?.images && file.val.images.length > 0) {
      for (const img of file.val.images) {
        const resp = await this.fileService.IDeleteImageByPrefix(img);
        if (!resp.ok) return FAIL(resp.errMessage, resp.code);
      }
    }
    const resp = await this.fileService.IDeleteImageByPrefix(file.val.fileName);
    if (!resp.ok) return FAIL(resp.errMessage, resp.code);

    const upload = await this.findByIdAndDelete(file.val._id);
    if (!upload.ok) return FAIL(upload.errMessage, upload.code);
    return upload;
  }

  public async deleteByUid(uid: string) {
    const resp = await this.fileService.IDeleteImageByPrefix(uid);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    const upload = await this.deleteMany({ uid });
    if (!upload.ok) throw new HttpException(upload.errMessage, upload.code);
  }

  public async deleteFileById(id: string) {
    const file = await this.findById(id);
    if (!file.ok) throw new HttpException(file.errMessage, file.code);

    const resp = await this.fileService.IDeleteImageByPrefix(file.val.uid);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    const upload = await this.deleteMany({ uid: file.val.uid });
    if (!upload.ok) throw new HttpException(upload.errMessage, upload.code);
    return upload;
  }
}
