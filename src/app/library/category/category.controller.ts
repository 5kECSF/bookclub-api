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
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryInput, CategoryQuery, UpdateCategoryDto } from './entities/category.dto';
import { pagiKeys, PaginatedRes, RoleType, UserFromToken } from '../../../common/common.types.dto';

import { pickKeys, removeKeys } from '@/common/util/util';
import { Category } from './entities/category.entity';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { generateSlug } from '@/common/util/functions';
import { Endpoint } from '@/common/constants/model.consts';
import { Express, Request } from 'express';
// import { FileProviderService } from '../../upload/upload-provider.service';
import { UploadService } from '@/app/upload/upload.service';
import { ApiTags } from '@nestjs/swagger';
import { UploadModel } from '@/app/upload/upload.entity';

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
    createDto.upload = img.val;

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
        refId: resp.val._id,
      },
    );
    if (!updatedImg.ok) throw new HttpException(updatedImg.errMessage, updatedImg.code);
    // resp.val.img.fullImg = img.val.fullImg;
    return resp.val;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async update(@Req() req: Request, @Param('id') id: string, @Body() updateDto: UpdateCategoryDto) {
    const user: UserFromToken = req['user'];
    const ctg = await this.categoryService.findById(id);
    if (!ctg.ok) throw new HttpException(ctg.errMessage, ctg.code);
    if (updateDto?.fileId) {
      const file = await this.uploadService.findById(ctg.val.upload._id);
      if (!file.ok) throw new HttpException(file.errMessage, file.code);
      updateDto.upload = file.val;
    }

    const res = await this.categoryService.updateById(id, updateDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id') id: string) {
    const res = await this.categoryService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    const result = await this.uploadService.deleteFileById(res.val.upload._id);
    if (!result.ok) throw new HttpException(result.errMessage, result.code);
    const deleteResp = await this.categoryService.findByIdAndDelete(id);
    if (!deleteResp.ok) throw new HttpException(res.errMessage, res.code);
    return deleteResp.val;
  }

  // == below queries dont need authentication
  @Get()
  async filterAndPaginate(@Query() inputQuery: CategoryQuery): Promise<PaginatedRes<Category>> {
    const query = removeKeys(inputQuery, [...pagiKeys, 'searchText']);

    const res = await this.categoryService.searchManyAndPaginate(['title'], query);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const res = await this.categoryService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }
}
