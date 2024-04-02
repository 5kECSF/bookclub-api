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
import { CategoryInput, CategoryQuery, UpdateCategoryDto } from './dto/category.dto';
import { pagiKeys, PaginatedRes, RoleType, UserFromToken } from '../../../common/common.types.dto';

import { pickKeys, removeKeys } from '@/common/util/util';
import { Category } from './entities/category.entity';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { generateSlug } from '@/common/util/functions';
import { Endpoint } from '@/common/constants/model.consts';
import { ApiSingleFiltered, ParseFile } from '@/app/upload/fileParser';
import { MaxImageSize } from '@/common/constants/system.consts';
import { Express, Request } from 'express';
// import { FileProviderService } from '../../upload/upload-provider.service';
import { UploadService } from '@/app/upload/upload.service';
import { ApiTags } from '@nestjs/swagger';

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
  @ApiSingleFiltered('file', true, MaxImageSize)
  async createOne(
    @Req() req: Request,
    @UploadedFile(ParseFile) file: Express.Multer.File,
    @Body() createDto: CategoryInput,
  ) {
    const user: UserFromToken = req['user'];
    const img = await this.uploadService.UploadSingle(file, user._id);
    if (!img.ok) throw new HttpException(img.errMessage, img.code);
    createDto.img = img.val;
    createDto.slug = generateSlug(createDto.name);
    const resp = await this.categoryService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    // resp.val.img.fullImg = img.val.fullImg;
    return resp.val;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  @ApiSingleFiltered('file', false, MaxImageSize)
  async update(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Param('id') id: string,
    @Body() updateDto: UpdateCategoryDto,
  ) {
    const user: UserFromToken = req['user'];
    const ctg = await this.categoryService.findById(id);
    if (!ctg.ok) throw new HttpException(ctg.errMessage, ctg.code);
    if (file && file.buffer) {
      const update = await this.uploadService.UpdateSingle(file, ctg.val.img.fileName, user._id);
    }

    const res = await this.categoryService.updateById(id, updateDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id') id: string) {
    const res = await this.categoryService.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    const result = await this.uploadService.deleteFileByQuery(res.val.img.fileName);
    if (!result.ok) throw new HttpException(result.errMessage, result.code);
    return res.val;
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
