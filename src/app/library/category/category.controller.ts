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
import { generateSlug } from '@/common/util/functions';
import { removeKeys } from '@/common/util/object-functions';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { Request } from 'express';
import { Category } from './entities/category.entity';
// import { FileProviderService } from '../../upload/upload-provider.service';
import { EmbedUpload, UploadModel, UploadStatus } from '@/app/upload/upload.entity';
import { UploadService } from '@/app/upload/upload.service';
import { ApiTags } from '@nestjs/swagger';
import { ThrowRes } from '../book/book.controller';

@Controller(Endpoint.Category)
@ApiTags(Endpoint.Category)
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private uploadService: UploadService,
  ) {}

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

    createDto.slug = generateSlug(createDto.name, false, false);
    const resp = await this.categoryService.createOne(createDto);
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

  //================  createDraft is P1:  for  New Ones where the draft is created first ============
  //====================================================================================================
  @Post('draft')
  @Roles(RoleType.USER)
  @UseGuards(JwtGuard)
  async createDraft(@Req() req: Request, @Body() createDto: CategoryInput): Promise<Category> {
    const user: UserFromToken = req['user'];
    const draftImg = await this.uploadService.CreateDraftImg(user._id, UploadModel.Category);
    if (!draftImg.ok) ThrowRes(draftImg);
    createDto.fileId = draftImg.body._id.toString();
    createDto.status = ItemStatus.Draft;
    createDto.upload = draftImg.body;
    createDto.slug = generateSlug(createDto.name);
    const resp = await this.categoryService.createOne(createDto);
    if (!resp.ok) ThrowRes(resp);
    return resp.body;
  }

  //================ activateDraft is P2:  for  New Ones where the draft is created 1st then activated ==
  //====================================================================================================

  @Post(':id')
  // @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async activateDraft(@Req() req: Request, @Param('id') id: string): Promise<Category> {
    // const user: UserFromToken = req['user'];
    const ctg = await this.categoryService.findById(id);
    if (!ctg.ok) ThrowRes(ctg);

    const updateImg = await this.uploadService.findOneAndUpdate(
      {
        _id: ctg.body.fileId,
        // status: UploadStatus.Uploaded,
      },
      {
        status: UploadStatus.Active,
        refId: ctg.body._id,
      },
    );
    if (!updateImg.ok) ThrowRes(updateImg);
    const upload: EmbedUpload = {
      fileName: updateImg.body.fileName,
      pathId: updateImg.body.pathId,
      uid: updateImg.body.uid,
    };
    if (!updateImg.ok) ThrowRes(updateImg);
    const resp = await this.categoryService.updateById(id, {
      status: ItemStatus.Active,
      upload: upload,
    });
    return resp.body;
  }

  //==================================! end Draft ==================================================================

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN, RoleType.USER)
  async update(@Req() req: Request, @Param('id') id: string, @Body() updateDto: UpdateCategoryDto) {
    const user: UserFromToken = req['user'];
    const ctg = await this.categoryService.findById(id);
    if (!ctg.ok) ThrowRes(ctg);
    if (updateDto?.fileId) {
      const file = await this.uploadService.findById(ctg.body.upload._id);
      if (!file.ok) ThrowRes(ctg);
      updateDto.upload = file.body;
    }

    const res = await this.categoryService.updateById(id, updateDto);
    if (!res.ok) ThrowRes(res);
    return res.body;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id') id: string) {
    const res = await this.categoryService.findById(id);
    if (!res.ok) ThrowRes(res);
    const result = await this.uploadService.deleteFileById(res.body.upload._id);
    if (!result.ok) ThrowRes(result);
    const deleteResp = await this.categoryService.findByIdAndDelete(id);
    if (!deleteResp.ok) ThrowRes(deleteResp);
    return deleteResp.body;
  }

  // == below queries dont need authentication
  @Get()
  async filterAndPaginate(@Query() inputQuery: CategoryQuery): Promise<PaginatedRes<Category>> {
    const query = removeKeys(inputQuery, [...pagiKeys, 'searchText']);

    const res = await this.categoryService.searchManyAndPaginate(['name'], query, CategoryFilter);
    if (!res.ok) ThrowRes(res);
    return res.body;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const res = await this.categoryService.findById(id);
    if (!res.ok) ThrowRes(res);
    return res.body;
  }
}
