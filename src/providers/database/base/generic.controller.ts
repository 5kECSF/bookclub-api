import { EmbedUpload, UploadModel, UploadStatus } from '@/app/upload/upload.entity';
import { UploadService } from '@/app/upload/upload.service';
import { Resp } from '@/common/constants/return.consts';
import { ReqParamPipe } from '@/common/lib/pipes';
import { PaginatedRes, UserFromToken } from '@/common/types/common.types.dto';
import { ItemStatus } from '@/common/types/enums';
import { generateSlug } from '@/common/util/random-functions';
import { ThrowRes } from '@/common/util/responseFunctions';
import { JwtGuard } from '@/providers/guards/guard.rest';
import {
  Body,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MongoGenericRepository } from './mongo.base.repo';

export class BaseController<T, D extends Partial<T>, F> {
  private _keysToFilter: (keyof T)[];
  private _fieldsToSearch: (keyof T)[];
  private _uploadModel: UploadModel;
  //   private _service: MongoGenericRepository<T>;
  protected constructor(
    protected readonly service: MongoGenericRepository<T>,
    private uploadService: UploadService,
    keysToFilter: (keyof T)[],
    fieldsToSearch: (keyof T)[],
    uploadModel: UploadModel,
  ) {
    this._keysToFilter = keysToFilter;
    this._fieldsToSearch = fieldsToSearch;
    this._fieldsToSearch = fieldsToSearch;
    this._uploadModel = uploadModel;
  }

  @Post('draft')
  //   @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async createDraft(@Req() req: Request, @Body() createDto: D): Promise<T> {
    const user: UserFromToken = req['user'];
    const draftImg = await this.uploadService.CreateEmptyDraftImg(user._id, this._uploadModel);
    if (!draftImg.ok) ThrowRes(draftImg);
    createDto['fileId'] = draftImg.body._id.toString();
    createDto['status'] = ItemStatus.Draft;
    createDto['upload'] = draftImg.body;
    createDto['slug'] = generateSlug(createDto['name'], true);
    const resp = await this.service.createOne(createDto);
    if (!resp.ok) ThrowRes(resp);
    return resp.body;
  }

  @Post(':id')
  // @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async activateDraft(@Param('id') id: string): Promise<T> {
    const data = await this.service.findById(id);
    if (!data.ok) ThrowRes(data);

    const updateImg = await this.uploadService.findOneAndUpdate(
      {
        _id: data.body['fileId'],
        // status: UploadStatus.Uploaded,
      },
      {
        status: UploadStatus.Active,
        refId: data.body['_id'],
      },
    );
    if (!updateImg.ok) ThrowRes(updateImg);
    const upload: EmbedUpload = {
      fileName: updateImg.body.fileName,
      pathId: updateImg.body.pathId,
      uid: updateImg.body.uid,
      url: updateImg.body.url,
    };
    const resp = await this.service.updateById(id, {
      status: ItemStatus.Active,
      upload: upload,
    });
    if (!resp.ok) ThrowRes(updateImg);
    return resp.body;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  // @Roles(RoleType.ADMIN)
  async updateWithFile(@Param('id') id: string, @Body() updateDto: D) {
    if (updateDto['fileId']) {
      const genre = await this.service.findById(id);
      if (!genre.ok) ThrowRes(genre);
      const file = await this.uploadService.findById(genre.body['fileId']);
      if (!file.ok) ThrowRes(file);
      updateDto['upload'] = file.body;
    }
    const res = await this.service.updateById(id, updateDto);
    if (!res.ok) ThrowRes(res);
    return res.body;
  }

  @Delete('/file/:id')
  @UseGuards(JwtGuard)
  // @Roles(RoleType.ADMIN)
  async remove(@Param('id', ReqParamPipe) id: string) {
    const query = { refId: id };
    const result = await this.uploadService.deleteFileByQuery(query);
    if (!result.ok) ThrowRes(result);
    const deleteResp = await this.service.findByIdAndDelete(id);
    if (!deleteResp.ok) ThrowRes(deleteResp);
    return deleteResp.body;
  }

  @Get()
  async filterAndPaginate(@Query() inputQuery: F): Promise<PaginatedRes<T>> {
    const res = await this.service.searchManyAndPaginate(
      this._fieldsToSearch,
      inputQuery,
      this._keysToFilter,
    );
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Resp<T>> {
    const res = await this.service.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res;
  }

  @Post()
  async create(@Body() data: D): Promise<Resp<T>> {
    const res = await this.service.createOne(data);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res;
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() data: Partial<T>): Promise<Resp<T>> {
    const res = await this.service.updateById(id, data);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res;
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<Resp<T>> {
    const res = await this.service.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res;
  }
}
