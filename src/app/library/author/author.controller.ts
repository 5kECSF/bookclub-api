import { FileProviderService } from '@/app/upload/file-provider.service';
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
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ThrowRes } from '../book/book.controller';
import { Author, AuthorFilter, AuthorQuery, CreateAuthorInput, UpdateDto } from './author.entity';
import { AuthorService } from './author.service';

@Controller(Endpoint.Author)
@ApiTags(Endpoint.Author)
export class AuthorController {
  constructor(
    private readonly authorService: AuthorService,
    private fileService: FileProviderService,
    private uploadService: UploadService,
  ) {}

  @Post()
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async createOne(@Req() req: Request, @Body() createDto: CreateAuthorInput): Promise<Author> {
    const user: UserFromToken = req['user'];
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

    const resp = await this.authorService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    // resp.val.img.fullImg = img.val.fullImg;
    return resp.body;
  }

  //================  createDraft is P1:  for  New Ones where the draft is created first ============
  //====================================================================================================
  @Post('draft')
  @Roles(RoleType.USER)
  @UseGuards(JwtGuard)
  async createDraft(@Req() req: Request, @Body() createDto: CreateAuthorInput): Promise<Author> {
    const user: UserFromToken = req['user'];
    const draftImg = await this.uploadService.CreateDraftImg(user._id, UploadModel.Author);
    if (!draftImg.ok) ThrowRes(draftImg);
    createDto.fileId = draftImg.body._id.toString();
    createDto.status = ItemStatus.Draft;
    createDto.upload = draftImg.body;
    createDto.slug = generateSlug(createDto.name);
    const resp = await this.authorService.createOne(createDto);
    if (!resp.ok) ThrowRes(resp);
    return resp.body;
  }

  //================ activateDraft is P2:  for  New Ones where the draft is created 1st then activated ==
  //====================================================================================================

  @Post(':id')
  // @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async activateDraft(@Req() req: Request, @Param('id') id: string): Promise<Author> {
    const user: UserFromToken = req['user'];
    const author = await this.authorService.findById(id);
    if (!author.ok) ThrowRes(author);

    const updateImg = await this.uploadService.findOneAndUpdate(
      {
        _id: author.body.fileId,
        // status: UploadStatus.Uploaded,
      },
      {
        status: UploadStatus.Active,
        refId: author.body._id,
      },
    );
    if (!updateImg.ok) ThrowRes(updateImg);
    const upload: EmbedUpload = {
      fileName: updateImg.body.fileName,
      pathId: updateImg.body.pathId,
      uid: updateImg.body.uid,
    };
    if (!updateImg.ok) ThrowRes(updateImg);
    const resp = await this.authorService.updateById(id, {
      status: ItemStatus.Active,
      upload: upload,
    });
    return resp.body;
  }

  //==================================! end Draft ==================================================================

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  @ApiSingleFiltered('file', true, MaxImageSize)
  async update(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Param('id') id: string,
    @Body() updateDto: UpdateDto,
  ) {
    const user: UserFromToken = req['user'];
    const author = await this.authorService.findById(id);
    if (!author.ok) throw new HttpException(author.errMessage, author.code);
    if (updateDto.fileId) {
      const file = await this.uploadService.findById(author.body.upload._id);
      if (!file.ok) throw new HttpException(file.errMessage, file.code);
      updateDto.upload = file.body;
    }
    const res = await this.authorService.updateById(id, updateDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id', ReqParamPipe) id: string) {
    const query = { refId: id };
    const result = await this.uploadService.deleteFileByQuery(query);
    if (!result.ok) {
      logTrace('fileNot found', result.errMessage);
      // throw new HttpException('file Not Found', result.code);
    }
    const res = await this.authorService.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    // const result = await this.uploadService.deleteFileById(res.body.upload._id);
    // if (!result.ok) throw new HttpException(result.errMessage, result.code);
    return res.body;
  }

  // == below queries dont need authentication
  @Get()
  async filterAndPaginate(@Query() inputQuery: AuthorQuery): Promise<PaginatedRes<Author>> {
    const res = await this.authorService.searchManyAndPaginate(['name'], inputQuery, AuthorFilter);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const res = await this.authorService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }
}
