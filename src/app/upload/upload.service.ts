import { HttpException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { UpdateBody, Upload, UploadDocument, UploadModel, UploadStatus } from './upload.entity';

import { FileProviderService } from '@/app/upload/file-provider.service';
import { FAIL, Resp, Succeed } from '@/common/constants/return.consts';
import { logTrace } from '@/common/logger';
import { UserFromToken } from '@/common/types/common.types.dto';
import { RoleType } from '@/common/types/enums';
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
    uid = '', //the uid for multi image upload function
    ctr = 0, //the counter for multi image upload function
  ): Promise<Resp<Upload>> {
    if (!file) return FAIL('File Must not be empty', 400);
    const imgName = generateUniqName(file.originalname, uid, ctr);
    const uploaded = await this.fileService.IUploadSingleImage(file.buffer, imgName.name);
    if (!uploaded.ok) return FAIL(uploaded.errMessage, uploaded.code);

    const upload = await this.createOne({ ...uploaded.body, userId, uid: imgName.uid });
    if (!upload.ok) return FAIL(upload.errMessage, upload.code);

    // logTrace('val', data);
    // logTrace('val', uploaded.val);
    return Succeed(upload.body);
  }

  //upload single takes file, the uid, userId then upload the file then save it to database
  public async CreateDraftImg(userId: string, model: UploadModel): Promise<Resp<Upload>> {
    const imgName = generateUniqName('file.ext');

    const upload = await this.createOne({
      userId,
      uid: imgName.uid,
      status: UploadStatus.Draft,
      model,
    });
    if (!upload.ok) throw new HttpException(upload.errMessage, upload.code);

    return Succeed(upload.body);
  }

  //get the draft files id & upload the file to it
  public async UploadDraftImg(
    file: Express.Multer.File,
    id: string,
    userId: string,
  ): Promise<Resp<Upload>> {
    if (!file) return FAIL('Image Must not be empty', 400);
    //Find the image from the database
    const draftImg = await this.findOne({ _id: id, userId: userId, status: UploadStatus.Draft });
    if (!draftImg.ok) return FAIL('Draft Image Not Found', draftImg.code);

    // Create a new image, we dont care about the name
    const uploaded = await this.fileService.IUploadWithNewName(file);
    if (!uploaded.ok) return FAIL(uploaded.errMessage, uploaded.code);
    //update the images details on the database
    //TODO: update the upload hash and size
    const res = await this.updateById(id, {
      ...uploaded.body,
      status: UploadStatus.Uploaded,
      userId,
    });
    if (!res.ok) return FAIL(res.errMessage, res.code);
    // upload.val.fullImg = uploaded.val.fullImg;
    return Succeed(res.body);
  }

  public async UpdateSingle(
    file: Express.Multer.File,
    query,
    userId: string,
  ): Promise<Resp<Upload>> {
    if (!file) return FAIL('Image Must not be empty', 400);
    //Find the image from the database
    const oldFile = await this.findOne(query);
    if (!oldFile.ok) return FAIL(oldFile.errMessage, oldFile.code);
    // Delete The old Image File
    if (!oldFile.body.fileName || oldFile.body.fileName.length < 3)
      return FAIL('fileName Not found', 400);
    const resp = await this.fileService.IDeleteImageByPrefix(oldFile.body.fileName);
    if (!resp.ok) return FAIL(resp.errMessage, resp.code);
    // Create a new image, we dont care about the name
    const uploaded = await this.fileService.IUploadWithNewName(file, oldFile.body.uid);
    if (!uploaded.ok) return FAIL(uploaded.errMessage, uploaded.code);
    //update the images details on the database
    //TODO: update the upload hash and size
    const res = await this.updateById(oldFile.body._id, {
      ...uploaded.body,
      userId,
    });
    if (!res.ok) return FAIL(res.errMessage, res.code);
    // upload.val.fullImg = uploaded.val.fullImg;
    return Succeed(res.body);
  }

  //======================================   Multi Images ===============

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
  ): Promise<Resp<Upload>> {
    if (!files.cover || files.cover.length < 1) return FAIL('Image Must not be empty');

    const single = await this.UploadSingle(files.cover[0], userId);
    if (!single.ok) return single;
    logTrace('upload single finished', single.body._id);
    if (files.images) {
      const images = await this.uploadManyWithNewNames(files.images, userId, single.body.uid);
      if (!images.ok) return FAIL(images.errMessage, images.code);
      await this.updateById(single.body._id, { images: images.body });
      single.body.images = images.body;
    }
    return Succeed(single.body);
  }

  /**
   * this is used by model one that uploads an image & multiple images
   * @param files
   * @param userId
   */
  public async UploadDraftWithCover(
    files: {
      cover?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
    fileId: string,
    userId: string,
  ): Promise<Resp<Upload>> {
    if (!files.cover || files.cover.length < 1) return FAIL('Image Must not be empty');

    let single = await this.UploadDraftImg(files.cover[0], fileId, userId);
    if (!single.ok) return single;
    logTrace('upload single finished', single.body._id);
    if (files.images) {
      const images = await this.uploadManyWithNewNames(files.images, userId, single.body.uid);
      if (!images.ok) return FAIL(images.errMessage, images.code);
      single = await this.updateById(single.body._id, { images: images.body });
      // single.body.images = images.body;
    }
    return Succeed(single.body);
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
  ): Promise<Resp<Upload>> {
    if (id === 'undefined') return FAIL('the file id is undefined', 400);
    const query = { _id: id };
    if (user?.role != RoleType.ADMIN) {
      query['userId'] = user._id;
    }
    // logTrace('update dto', updateDto);
    const primaryFile = await this.findOne(query);
    if (!primaryFile.ok) return FAIL(primaryFile.errMessage, primaryFile.code);

    let imagesList = primaryFile.body.images || [];

    /**
     * if images have been removed
     */
    if (updateDto?.removedImages && updateDto.removedImages.length > 0) {
      logTrace('images to be removed===', updateDto.removedImages);

      // if `updateDto.removedImages` is not an array, make it an array(it becomes a string if it is a single element)
      if (!Array.isArray(updateDto.removedImages))
        updateDto.removedImages = [updateDto.removedImages];
      // logTrace('images to be removed', updateDto.removedImages);
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

      //remove the deleted images from the new Images list
      imagesList = removeSubArr(imagesList, removed);
      // logTrace('new images are', imagesList);
    }

    // if the primary image have been updated
    if (files.cover && files.cover.length > 0) {
      logTrace('Updating Cover', files.cover.length);
      const result = await this.UpdateSingle(
        files.cover[0],
        { _id: primaryFile.body._id },
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
      const images = await this.uploadManyWithNewNames(
        files.images,
        user._id,
        primaryFile.body.uid,
      );
      if (!images.ok) return FAIL(images.errMessage, images.code);
      imagesList = [...imagesList, ...images.body];
    }
    // update the images array of hte primary image
    const imageObj = await this.updateById(primaryFile.body._id, {
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
          names.push(data.body.fileName);
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

    if (file?.body?.images && file.body.images.length > 0) {
      for (const img of file.body.images) {
        const resp = await this.fileService.IDeleteImageByPrefix(img);
        if (!resp.ok) return FAIL(resp.errMessage, resp.code);
      }
    }
    const resp = await this.fileService.IDeleteImageByPrefix(file.body.fileName);
    if (!resp.ok) return FAIL(resp.errMessage, resp.code);

    const upload = await this.findByIdAndDelete(file.body._id);
    if (!upload.ok) return FAIL(upload.errMessage, upload.code);
    return upload;
  }

  public async deleteByUid(uid: string) {
    const resp = await this.fileService.IDeleteImageByPrefix(uid);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    const upload = await this.deleteMany({ uid });
    if (!upload.ok) throw new HttpException(upload.errMessage, upload.code);
  }

  public async deleteFileByIdPrefix(id: string) {
    const file = await this.findById(id);
    if (!file.ok) throw new HttpException(file.errMessage, file.code);

    const resp = await this.fileService.IDeleteImageByPrefix(file.body.uid);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    const upload = await this.deleteMany({ uid: file.body.uid });
    if (!upload.ok) throw new HttpException(upload.errMessage, upload.code);
    return upload;
  }

  public async deleteFileById(id: string) {
    const file = await this.findById(id);
    if (!file.ok) throw new HttpException(file.errMessage, file.code);

    const resp = await this.fileService.IDeleteImageByName(file.body.fileName);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    if (file?.body?.images && file.body.images.length > 0) {
      for (const img of file.body.images) {
        const resp = await this.fileService.IDeleteImageByName(img);
        if (!resp.ok) return FAIL(resp.errMessage, resp.code);
      }
    }

    const upload = await this.deleteMany({ uid: file.body.uid });
    if (!upload.ok) throw new HttpException(upload.errMessage, upload.code);
    return upload;
  }
}
