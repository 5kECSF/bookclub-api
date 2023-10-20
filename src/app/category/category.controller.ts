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
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CategoryInput, CategoryQuery, UpdateCategoryDto } from './dto/category.dto';
import { pagiKeys, PaginatedRes, RoleType } from '../../common/common.types.dto';

import { pickKeys, removeKeys } from '../../common/util/util';
import { Category } from './entities/category.entity';
import { JwtGuard } from '../../providers/guards/guard.rest';
import { Roles } from '../../providers/guards/roles.decorators';
import { generateSlug } from '../../common/util/functions';
import { Endpoint } from '../../common/constants/model.consts';
import { ApiSingleFiltered, ParseFile } from '../file/fileParser';
import { MaxImageSize } from '../../common/constants/system.consts';
import { Express } from 'express';
import { FileService } from '../file/file.service';

@Controller(Endpoint.Category)
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
    private fileService: FileService,
  ) {}

  @Post()
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  @ApiSingleFiltered('file', true, MaxImageSize)
  async createOne(
    @UploadedFile(ParseFile) file: Express.Multer.File,
    @Body() createDto: CategoryInput,
  ) {
    const img = await this.fileService.UploadSingle(file);
    if (!img.ok) throw new HttpException(img.errMessage, img.code);
    createDto.img = img.val;
    createDto.slug = generateSlug(createDto.name);
    const resp = await this.categoryService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    resp.val.img.fullImg= img.val.fullImg
    return resp.val;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  @ApiSingleFiltered('file', false, MaxImageSize)
  async update(@UploadedFile() file: Express.Multer.File, @Param('id') id: string, @Body() updateDto: UpdateCategoryDto) {
    const ctg = await this.categoryService.findById(id);
    if (!ctg.ok) throw new HttpException(ctg.errMessage, ctg.code);
    if(file && file.buffer){
      const update = await this.fileService.IUploadSingleImage(file.buffer, ctg.val.img.image)
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
