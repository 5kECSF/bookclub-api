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
import { GenreService } from './genre.service';
import { RoleType, UserFromToken } from '@/common/common.types.dto';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { CreateGenreInput, Genre, GenreQuery, UpdateDto } from './entities/genre.entity';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { generateSlug } from '@/common/util/functions';
import { Endpoint } from '@/common/constants/model.consts';
import { ApiSingleFiltered } from '@/app/upload/fileParser';
import { MaxImageSize } from '@/common/constants/system.consts';
import { Express, Request } from 'express';
import { ReqParamPipe } from '@/common/lib/pipes';
import { UploadService } from '@/app/upload/upload.service';
import { UploadDto } from '@/app/upload/upload.entity';
import { logTrace } from '@/common/logger';

@Controller(Endpoint.Genre)
@ApiTags(Endpoint.Genre)
export class GenreController {
  constructor(private readonly genreService: GenreService, private uploadService: UploadService) {}

  @Post()
  // @Roles(RoleType.ADMIN)
  // @UseGuards(JwtGuard)
  async createOne(@Req() req: Request, @Body() createDto: CreateGenreInput): Promise<Genre> {
    const user: UserFromToken = req['user'];
    const img = await this.uploadService.findById(createDto.fileId);
    if (!img.ok) throw new HttpException(img.errMessage, img.code);
    logTrace('img', img.val);
    const upload: UploadDto = {
      _id: img.val._id,
      fileName: img.val.fileName,
      pathId: img.val.pathId,
    };
    createDto.upload = upload;
    createDto.slug = generateSlug(createDto.name);
    const resp = await this.genreService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    //this is for testing purposes
    // resp.val.img.fullImg = img.val.fullImg;
    return resp.val;
  }

  @Patch(':id')
  // @UseGuards(JwtGuard)
  // @Roles(RoleType.ADMIN)
  @ApiSingleFiltered('file', true, MaxImageSize)
  async update(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Param('id') id: string,
    @Body() updateDto: UpdateDto,
  ) {
    const user: UserFromToken = req['user'];
    const genre = await this.genreService.findById(id);
    if (!genre.ok) throw new HttpException(genre.errMessage, genre.code);
    if (file && file.buffer) {
      const update = await this.uploadService.UpdateSingle(
        file,
        genre.val.upload.fileName,
        user._id,
      );
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
    const result = await this.uploadService.deleteFileByQuery(res.val.upload.uid);
    if (!result.ok) throw new HttpException(result.errMessage, result.code);
    return res.val;
  }

  // == below queries don't need authentication
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
