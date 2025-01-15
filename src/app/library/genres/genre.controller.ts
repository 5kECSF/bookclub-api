import { EmbedUpload, UploadModel, UploadStatus } from '@/app/upload/upload.entity';
import { UploadService } from '@/app/upload/upload.service';
import { Endpoint } from '@/common/constants/model.names';
import { ReqParamPipe } from '@/common/lib/pipes';
import { logTrace } from '@/common/logger';
import { PaginatedRes, UserFromToken } from '@/common/types/common.types.dto';
import { ItemStatus, RoleType } from '@/common/types/enums';
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
import { ThrowRes } from '../book/book.controller';
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

  //================createOne is for  Old one's Where Image is uploaded first
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
    if (!resp.ok) ThrowRes(resp);
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

  //================createDraft is P1:  for  New Ones where the draft is created first
  @Post('draft')
  @Roles(RoleType.USER)
  @UseGuards(JwtGuard)
  async createDraft(@Req() req: Request, @Body() createDto: CreateGenreInput): Promise<Genre> {
    const user: UserFromToken = req['user'];
    const draftImg = await this.uploadService.CreateDraftImg(user._id, UploadModel.Genre);
    if (!draftImg.ok) ThrowRes(draftImg);
    createDto.fileId = draftImg.body._id.toString();
    createDto.status = ItemStatus.Draft;
    createDto.upload = draftImg.body;
    createDto.slug = generateSlug(createDto.name);
    const resp = await this.genreService.createOne(createDto);
    if (!resp.ok) ThrowRes(resp);
    return resp.body;
  }

  //================activateDraft is P2:  for  New Ones where the draft is created 1st then activated
  @Post(':id')
  // @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async activateDraft(@Req() req: Request, @Param('id') id: string): Promise<Genre> {
    const user: UserFromToken = req['user'];
    const genre = await this.genreService.findById(id);
    if (!genre.ok) ThrowRes(genre);

    const updateImg = await this.uploadService.findOneAndUpdate(
      {
        _id: genre.body.fileId,
        // status: UploadStatus.Uploaded,
      },
      {
        status: UploadStatus.Active,
        refId: genre.body._id,
      },
    );
    if (!updateImg.ok) ThrowRes(updateImg);
    const upload: EmbedUpload = {
      fileName: updateImg.body.fileName,
      pathId: updateImg.body.pathId,
      uid: updateImg.body.uid,
    };
    const resp = await this.genreService.updateById(id, {
      status: ItemStatus.Active,
      upload: upload,
    });
    if (!resp.ok) ThrowRes(updateImg);
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

    if (updateDto?.fileId) {
      const genre = await this.genreService.findById(id);
      if (!genre.ok) ThrowRes(genre);
      const file = await this.uploadService.findById(genre.body.fileId);
      if (!file.ok) ThrowRes(file);
      updateDto.upload = file.body;
    }
    const res = await this.genreService.updateById(id, updateDto);
    if (!res.ok) ThrowRes(res);
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
    if (!res.ok) ThrowRes(res);

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
