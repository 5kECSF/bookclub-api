import { ApiSingleFiltered } from '@/app/upload/fileParser';
import { EmbedUpload, UploadModel, UploadStatus } from '@/app/upload/upload.entity';
import { UploadService } from '@/app/upload/upload.service';
import { Endpoint } from '@/common/constants/model.names';
import { MaxImageSize } from '@/common/constants/system.consts';
import { ReqParamPipe } from '@/common/lib/pipes';
import { logTrace } from '@/common/logger';
import { PaginatedRes, UserFromToken } from '@/common/types/common.types.dto';
import { ItemStatus, RoleType } from '@/common/types/enums';
import { generateSlug } from '@/common/util/functions';
import { ThrowRes } from '@/common/util/responseFunctions';
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
import { ApiTags } from '@nestjs/swagger';
import { Author, AuthorFilter, AuthorQuery, CreateAuthorInput, UpdateDto } from './author.entity';
import { AuthorService } from './author.service';

@Controller(Endpoint.Author)
@ApiTags(Endpoint.Author)
export class AuthorController {
  constructor(private readonly service: AuthorService, private uploadService: UploadService) {}

  //================  createDraft is P1:  for  New Ones where the draft is created first ============
  //====================================================================================================
  @Post('draft')
  @Roles(RoleType.USER)
  @UseGuards(JwtGuard)
  async createDraft(@Req() req: Request, @Body() createDto: CreateAuthorInput): Promise<Author> {
    const user: UserFromToken = req['user'];
    const draftImg = await this.uploadService.CreateDraftImg(user._id, UploadModel.Genre);
    if (!draftImg.ok) ThrowRes(draftImg);
    createDto.fileId = draftImg.body._id.toString();
    createDto.status = ItemStatus.Draft;
    createDto.upload = draftImg.body;
    createDto.slug = generateSlug(createDto.name);
    const resp = await this.service.createOne(createDto);
    if (!resp.ok) ThrowRes(resp);
    return resp.body;
  }

  //================ activateDraft is P2:  for  New Ones where the draft is created 1st then activated ==
  //====================================================================================================

  @Post(':id')
  // @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async activateDraft(@Param('id') id: string): Promise<Author> {
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

  //==================================! end Draft =========================

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  @ApiSingleFiltered('file', true, MaxImageSize)
  async update(@Param('id') id: string, @Body() updateDto: UpdateDto) {
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
  async remove(@Param('id', ReqParamPipe) id: string) {
    const query = { refId: id };
    const result = await this.uploadService.deleteFileByQuery(query);
    if (!result.ok) ThrowRes(result);
    const deleteResp = await this.service.findByIdAndDelete(id);
    if (!deleteResp.ok) ThrowRes(deleteResp);
    return deleteResp.body;
  }

  // ================================ Fetch Queries
  // ================================ ================================
  @Get()
  async filterAndPaginate(@Query() inputQuery: AuthorQuery): Promise<PaginatedRes<Author>> {
    const res = await this.service.searchManyAndPaginate(['name'], inputQuery, AuthorFilter);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const res = await this.service.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  // ================  Depricated Functions
  /* @depricated: this waits for the file id from the client*/
  @Post()
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async createOne(@Body() createDto: CreateAuthorInput): Promise<Author> {
    const img = await this.uploadService.findById(createDto.fileId);
    if (!img.ok) throw new HttpException(img.errMessage, img.code);
    logTrace('img', img.body);
    const upload: EmbedUpload = {
      _id: img.body._id,
      fileName: img.body.fileName,
      pathId: img.body.pathId,
    };
    createDto.upload = upload;
    createDto.slug = generateSlug(createDto.name);

    const resp = await this.service.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    // resp.val.img.fullImg = img.val.fullImg;
    return resp.body;
  }
}
