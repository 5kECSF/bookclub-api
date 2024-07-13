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
import { AuthorService } from './author.service';
import { PaginatedRes, RoleType, UserFromToken } from '@/common/common.types.dto';
import { ApiTags } from '@nestjs/swagger';
import { Author, AuthorQuery, CreateAuthorInput, UpdateDto } from './entities/author.entity';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { generateSlug } from '@/common/util/functions';
import { Endpoint } from '@/common/constants/model.consts';
import { ApiSingleFiltered, ParseFile } from '@/app/upload/fileParser';
import { MaxImageSize } from '@/common/constants/system.consts';
import { Express } from 'express';
import { FileProviderService } from '@/app/upload/file-provider.service';
import { ReqParamPipe } from '@/common/lib/pipes';
import { UploadService } from '@/app/upload/upload.service';
import { logTrace } from '@/common/logger';
import { EmbedUpload } from '@/app/upload/upload.entity';

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
    logTrace('img', img.val);
    const upload: EmbedUpload = {
      _id: img.val._id,
      fileName: img.val.fileName,
      pathId: img.val.pathId,
    };
    createDto.upload = upload;
    createDto.slug = generateSlug(createDto.name);

    const resp = await this.authorService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    // resp.val.img.fullImg = img.val.fullImg;
    return resp.val;
  }

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
      const file = await this.uploadService.findById(author.val.upload._id);
      if (!file.ok) throw new HttpException(file.errMessage, file.code);
      updateDto.upload = file.val;
    }
    const res = await this.authorService.updateById(id, updateDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id', ReqParamPipe) id: string) {
    const res = await this.authorService.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    const result = await this.uploadService.deleteFileById(res.val.upload._id);
    if (!result.ok) throw new HttpException(result.errMessage, result.code);
    return res.val;
  }

  // == below queries dont need authentication
  @Get()
  async filterAndPaginate(@Query() inputQuery: AuthorQuery): Promise<PaginatedRes<Author>> {
    const res = await this.authorService.searchManyAndPaginate(['title'], inputQuery);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const res = await this.authorService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }
}
