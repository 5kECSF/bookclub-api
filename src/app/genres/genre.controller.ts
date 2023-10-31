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
import { GenreService } from './genre.service';
import { CreateGenreInput, GenreQuery, UpdateDto } from './dto/genres.dto';
import { PaginatedRes, RoleType } from '../../common/common.types.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Genre } from './entities/genre.entity';
import { JwtGuard } from '../../providers/guards/guard.rest';
import { Roles } from '../../providers/guards/roles.decorators';
import { generateSlug } from '../../common/util/functions';
import { Endpoint } from '../../common/constants/model.consts';
import { ApiSingleFiltered, ParseFile } from '../file/fileParser';
import { MaxImageSize } from '../../common/constants/system.consts';
import { Express } from 'express';
import { FileService } from '../file/file.service';
import { ReqParamPipe } from 'src/common/lib/pipes';

@Controller(Endpoint.Genre)
export class GenreController {
  constructor(private readonly genreService: GenreService, private fileService: FileService) {}

  @Post()
  // @Roles(RoleType.ADMIN)
  // @UseGuards(JwtGuard)
  @ApiSingleFiltered('file', true, MaxImageSize)
  async createOne(
    @UploadedFile(ParseFile) file: Express.Multer.File,
    @Body() createDto: CreateGenreInput,
  ): Promise<Genre> {
    const img = await this.fileService.UploadSingle(file);
    if (!img.ok) throw new HttpException(img.errMessage, img.code);
    createDto.img = img.val;
    createDto.slug = generateSlug(createDto.name);

    const resp = await this.genreService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    resp.val.img.fullImg = img.val.fullImg;
    return resp.val;
  }

  @Patch(':id')
  // @UseGuards(JwtGuard)
  // @Roles(RoleType.ADMIN)
  @ApiSingleFiltered('file', true, MaxImageSize)
  async update(
    @UploadedFile() file: Express.Multer.File,
    @Param('id') id: string,
    @Body() updateDto: UpdateDto,
  ) {
    const genre = await this.genreService.findById(id);
    if (!genre.ok) throw new HttpException(genre.errMessage, genre.code);
    if (file && file.buffer) {
      const update = await this.fileService.IUploadSingleImage(file.buffer, genre.val.img.image);
    }
    const res = await this.genreService.updateById(id, updateDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id', ReqParamPipe) id: string) {
    const res = await this.genreService.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    const result = await this.fileService.IDeleteImageById(res.val.img.uid);
    if (!result.ok) throw new HttpException(result.errMessage, result.code);
    return res.val;
  }

  // == below queries dont need authentication
  @Get()
  async filterAndPaginate(@Query() inputQuery: GenreQuery): Promise<GenreResponse> {
    const res = await this.genreService.searchManyAndPaginate(['title'], inputQuery);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const res = await this.genreService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }
}

export class GenreResponse {
  count: number;

  @ApiProperty({
    type: [Genre],
  })
  data: Genre[];
}
