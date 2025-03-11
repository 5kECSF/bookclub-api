import { ItemStatus, RoleType } from '@/common/types/enums';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { pagiKeys, PaginatedRes, UserFromToken } from '../../../common/types/common.types.dto';
import { CategoryService } from './category.service';
import {
  CategoryFilter,
  CategoryInput,
  CategoryQuery,
  UpdateCategoryDto,
} from './entities/category.dto';

import { Endpoint } from '@/common/constants/model.names';
import { removeKeys } from '@/common/util/object-functions';
import { generateSlug } from '@/common/util/random-functions';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { Request } from 'express';
import { Category } from './entities/category.entity';
// import { FileProviderService } from '../../upload/upload-provider.service';
import { EmbedUpload, UploadModel, UploadStatus } from '@/app/upload/upload.entity';
import { UploadService } from '@/app/upload/upload.service';
import { ThrowRes } from '@/common/util/responseFunctions';
import { ApiTags } from '@nestjs/swagger';

@Controller(Endpoint.Category)
@ApiTags(Endpoint.Category)
export class CategoryController {
  constructor(private readonly service: CategoryService, private uploadService: UploadService) {}

  //================  createDraft is P1:  for  New Ones where the draft is created first ============
  //====================================================================================================
  @Post('draft')
  @Roles(RoleType.USER)
  @UseGuards(JwtGuard)
  async createDraft(@Req() req: Request, @Body() createDto: CategoryInput): Promise<Category> {
    const user: UserFromToken = req['user'];
    const draftImg = await this.uploadService.CreateEmptyDraftImg(user._id, UploadModel.Category);
    if (!draftImg.ok) ThrowRes(draftImg);
    createDto.fileId = draftImg.body._id.toString();
    createDto.status = ItemStatus.Draft;
    createDto.upload = draftImg.body;
    createDto.slug = generateSlug(createDto.name, true);
    const resp = await this.service.createOne(createDto);
    if (!resp.ok) ThrowRes(resp);
    return resp.body;
  }

  //================ activateDraft is P2:  for  New Ones where the draft is created 1st then activated ==
  //====================================================================================================

  @Post(':id')
  // @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async activateDraft(@Param('id') id: string): Promise<Category> {
    const data = await this.service.findById(id);
    if (!data.ok) ThrowRes(data);

    const updateImg = await this.uploadService.findOneAndUpdate(
      {
        _id: data.body.fileId,
        // status: UploadStatus.Uploaded,
      },
      {
        status: UploadStatus.Active,
        refId: data.body._id,
      },
    );
    if (!updateImg.ok) ThrowRes(updateImg);
    const upload: EmbedUpload = {
      fileName: updateImg.body.fileName,
      pathId: updateImg.body.pathId,
      uid: updateImg.body.uid,
    };
    const resp = await this.service.updateById(id, {
      status: ItemStatus.Active,
      upload: upload,
    });
    if (!resp.ok) ThrowRes(updateImg);
    return resp.body;
  }

  //==================================! end Draft ==================================================================

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN, RoleType.USER)
  async update(@Param('id') id: string, @Body() updateDto: UpdateCategoryDto) {
    if (updateDto?.fileId) {
      const genre = await this.service.findById(id);
      if (!genre.ok) ThrowRes(genre);
      const file = await this.uploadService.findById(genre.body.fileId);
      if (!file.ok) ThrowRes(file);
      updateDto.upload = file.body;
    }
    const res = await this.service.updateById(id, updateDto);
    if (!res.ok) ThrowRes(res);
    return res.body;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id') id: string) {
    const res = await this.service.findById(id);
    if (!res.ok) ThrowRes(res);
    const result = await this.uploadService.deleteFileByIdPrefix(res.body.fileId);
    if (!result.ok) ThrowRes(result);
    const deleteResp = await this.service.findByIdAndDelete(id);
    if (!deleteResp.ok) ThrowRes(deleteResp);
    return deleteResp.body;
  }

  // == below queries dont need authentication
  @Get()
  async filterAndPaginate(@Query() inputQuery: CategoryQuery): Promise<PaginatedRes<Category>> {
    const query = removeKeys(inputQuery, [...pagiKeys, 'searchText']);
    const res = await this.service.searchManyAndPaginate(['name'], query, CategoryFilter);
    if (!res.ok) ThrowRes(res);
    return res.body;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const res = await this.service.findById(id);
    if (!res.ok) ThrowRes(res);
    return res.body;
  }

  // ================  Depricated Functions
  /* @depricated: this waits for the file id from the client*/
  @Post()
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async createOne(@Req() req: Request, @Body() createDto: CategoryInput) {
    const user: UserFromToken = req['user'];
    const img = await this.uploadService.findOne({
      _id: createDto.fileId,
      // model: UploadModel.NotAssigned,
    });
    if (!img.ok) throw new HttpException('Image Not Found', img.code);
    createDto.upload = img.body;

    createDto.slug = generateSlug(createDto.name, true);
    const resp = await this.service.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    const updatedImg = await this.uploadService.findOneAndUpdate(
      {
        _id: createDto.fileId,
        // model: UploadModel.NotAssigned,
      },
      {
        model: UploadModel.Category,
        refId: resp.body._id,
      },
    );
    if (!updatedImg.ok) throw new HttpException(updatedImg.errMessage, updatedImg.code);
    // resp.val.img.fullImg = img.val.fullImg;
    return resp.body;
  }
}
