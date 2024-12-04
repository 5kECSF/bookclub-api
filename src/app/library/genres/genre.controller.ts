import { UploadModel } from '@/app/upload/upload.entity';
import { UploadService } from '@/app/upload/upload.service';
import { PaginatedRes, RoleType, UserFromToken } from '@/common/common.types.dto';
import { Endpoint } from '@/common/constants/model.consts';
import { ReqParamPipe } from '@/common/lib/pipes';
import { logTrace } from '@/common/logger';
import { generateSlug } from '@/common/util/functions';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
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
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import {
  CreateGenreInput,
  Genre,
  GenreFilter,
  GenreQuery,
  UpdateDto,
} from './entities/genre.entity';
import { GenreService } from './genre.service';

@Controller(Endpoint.Genre)
@ApiTags(Endpoint.Genre)
export class GenreController {
  constructor(private readonly genreService: GenreService, private uploadService: UploadService) {}

  @Post()
  // @Roles(RoleType.ADMIN)
  // @UseGuards(JwtGuard)
  async createOne(@Req() req: Request, @Body() createDto: CreateGenreInput): Promise<Genre> {
    const user: UserFromToken = req['user'];
    //find the image
    const img = await this.uploadService.findOne({
      _id: createDto.fileId,
      model: UploadModel.NotAssigned,
    });
    if (!img.ok) throw new HttpException(img.errMessage, img.code);
    createDto.upload = img.body;
    createDto.slug = generateSlug(createDto.name);
    const resp = await this.genreService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    const updateImg = await this.uploadService.findOneAndUpdate(
      {
        _id: createDto.fileId,
        model: UploadModel.NotAssigned,
      },
      {
        model: UploadModel.Genre,
        refId: resp.body._id,
      },
    );
    if (!updateImg.ok) throw new HttpException(updateImg.errMessage, updateImg.code);
    //this is for testing purposes
    // resp.val.img.fullImg = img.val.fullImg;
    return resp.body;
  }

  @Patch(':id')
  // @UseGuards(JwtGuard)
  // @Roles(RoleType.ADMIN)
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateDto: UpdateDto,
  ): Promise<Genre> {
    const user: UserFromToken = req['user'];
    const genre = await this.genreService.findById(id);
    if (!genre.ok) throw new HttpException(genre.errMessage, genre.code);
    if (updateDto?.fileId) {
      const file = await this.uploadService.findById(genre.body.upload._id);
      if (!file.ok) throw new HttpException(file.errMessage, file.code);
      updateDto.upload = file.body;
    }
    const res = await this.genreService.updateById(id, updateDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id', ReqParamPipe) id: string) {
    const query = { refId: id, isPrimary: true };
    const result = await this.uploadService.deleteFileByQuery(query);
    if (!result.ok) {
      logTrace('fileNot found', result.errMessage);
      // throw new HttpException('file Not Found', result.code);
    }
    const res = await this.genreService.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);

    return res.body;
  }

  // == below queries don't need authentication
  @Get()
  async filterAndPaginate(@Query() inputQuery: GenreQuery): Promise<PaginatedRes<Genre>> {
    const res = await this.genreService.searchManyAndPaginate(['name'], inputQuery, GenreFilter);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const res = await this.genreService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }
}

export class GenreResponse {
  count: number;

  @ApiProperty({
    type: [Genre],
  })
  data: Genre[];
}
