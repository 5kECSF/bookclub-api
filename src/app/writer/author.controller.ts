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
import { AuthorService } from './author.service';
import { CreateAuthorInput, AuthorQuery, UpdateDto } from './dto/author.dto';
import { PaginatedRes, RoleType } from '../../common/common.types.dto';
import { ApiProperty } from '@nestjs/swagger';
import { Author } from './entities/author.entity';
import { JwtGuard } from '../../providers/guards/guard.rest';
import { Roles } from '../../providers/guards/roles.decorators';
import { generateSlug } from '../../common/util/functions';
import { Endpoint } from '../../common/constants/model.consts';
import { ApiSingleFiltered, ParseFile } from '../file/fileParser';
import { MaxImageSize } from '../../common/constants/system.consts';
import { Express } from 'express';
import { FileService } from '../file/file.service';
import { ReqParamPipe } from 'src/common/lib/pipes';

@Controller(Endpoint.Author)
export class AuthorController {
  constructor(private readonly authorService: AuthorService, private fileService: FileService) {}

  @Post()
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  @ApiSingleFiltered('file', true, MaxImageSize)
  async createOne(
    @UploadedFile(ParseFile) file: Express.Multer.File,
    @Body() createDto: CreateAuthorInput,
  ): Promise<Author> {
    const img = await this.fileService.UploadSingle(file);
    if (!img.ok) throw new HttpException(img.errMessage, img.code);
    createDto.img = img.val;
    createDto.slug = generateSlug(createDto.name);

    const resp = await this.authorService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    resp.val.img.fullImg = img.val.fullImg;
    return resp.val;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  @ApiSingleFiltered('file', true, MaxImageSize)
  async update(
    @UploadedFile() file: Express.Multer.File,
    @Param('id') id: string,
    @Body() updateDto: UpdateDto,
  ) {
    const author = await this.authorService.findById(id);
    if (!author.ok) throw new HttpException(author.errMessage, author.code);
    if (file && file.buffer) {
      const update = await this.fileService.IUploadSingleImage(file.buffer, author.val.img.image);
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
    const result = await this.fileService.IDeleteImageById(res.val.img.uid);
    if (!result.ok) throw new HttpException(result.errMessage, result.code);
    return res.val;
  }

  // == below queries dont need authentication
  @Get()
  async filterAndPaginate(@Query() inputQuery: AuthorQuery): Promise<AuthorResponse> {
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

export class AuthorResponse {
  count: number;

  @ApiProperty({
    type: [Author],
  })
  data: Author[];
}
