import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Req,
  HttpException,
  UseInterceptors,
  UploadedFiles,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { BookService } from './book.service';
import { BookQuery, CreateBookInput, UpdateBookDto } from './dto/book.dto';
import { imageFileRegex, PaginatedRes, RoleType } from '../../common/common.types.dto';

import { Book } from './entities/book.entity';
import { JwtGuard } from '../../providers/guards/guard.rest';
import { UserFromToken } from '../../common/common.types.dto';
import { Express, Request } from 'express';
import { Roles } from '../../providers/guards/roles.decorators';
import { GenreService } from '../genres/genre.service';
import { CategoryService } from '../category/category.service';

import { generateSlug } from '../../common/util/functions';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FileService } from '../file/file.service';
import { ApiManyFiltered } from '../file/fileParser';
import { ColorEnums, logTrace } from '../../common/logger';

@Controller('book')
export class BookController {
  constructor(
    private readonly bookService: BookService,
    private readonly genreService: GenreService,
    private readonly categoryService: CategoryService,
    private fileService: FileService,
  ) {}

  @Post()
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  @ApiManyFiltered('cover', 'images', 3, 1000 * 1000 * 10)
  async createOne(
    @Req() req: Request,
    @Body() createDto: CreateBookInput,
    @UploadedFiles() files: { cover?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ): Promise<Book> {
    const keys = Object.keys(files);
    logTrace('files', keys, ColorEnums.BgGreen);
    const keys2 = Object.keys(files.images[0]);
    const keys3 = Object.keys(files.cover[0]);
    logTrace('files2', keys2, ColorEnums.BgGreen);
    logTrace('files3', keys3, ColorEnums.BgGreen);
    const imgName = this.fileService.generateUniqName(files.cover[0].originalname);
    const uploaded = await this.fileService.IUploadSingleImage(files.cover[0].buffer, imgName.name);
    if (!uploaded.ok) throw new HttpException(uploaded.errMessage, uploaded.code);

    const images = await this.fileService.uploadManyWithNewNames(files.images, imgName.uid);
    if (!images.ok) throw new HttpException(images.errMessage, images.code);

    createDto.img.images = images.val;
    createDto.img.image = uploaded.val.image;
    createDto.img.imageId = imgName.uid;
    createDto.slug = generateSlug(createDto.title);
    const resp = await this.bookService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    const ctg = await this.categoryService.updateOneAndReturnCount(
      { _id: createDto.categoryId },
      { $inc: { count: 1 } },
    );
    const tag = await this.genreService.updateMany(
      { userId: { $in: createDto.genres } },
      { $inc: { instanceNo: 1 } },
    );
    return resp.val;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async update(@Req() req: Request, @Param('id') id: string, @Body() updateBookDto: UpdateBookDto) {
    const res = await this.bookService.findOneAndUpdate({ _id: id }, updateBookDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async removeOne(@Req() req: Request, @Param('id') id: string): Promise<Book> {
    const res = await this.bookService.findOneAndRemove({ _id: id });
    if (!res.ok) throw new HttpException(res.errMessage, res.code);

    const ctg = await this.categoryService.updateOneAndReturnCount(
      { _id: res.val.categoryId },
      { $inc: { count: -1 } },
    );
    const tag = await this.genreService.updateMany(
      { userId: { $in: res.val.genres } },
      { $inc: { instanceNo: -1 } },
    );

    return res.val;
  }

  @Post('like/:bookId')
  @UseGuards(JwtGuard)
  async like(@Req() req: Request, @Param('bookId') bookId: string) {
    const user: UserFromToken = req['user'];

    return this.bookService.Like(bookId, user._id);
  }

  @Post('dislike/:bookId')
  @UseGuards(JwtGuard)
  async disLike(@Req() req: Request, @Param('bookId') bookId: string) {
    const user: UserFromToken = req['user'];
    return this.bookService.Dislike(bookId, user._id);
  }

  //=   ========  the below queries dont need authentication

  @Get()
  async filterManyAndPaginate(@Query() inputQuery: BookQuery): Promise<PaginatedRes<Book>> {
    // const query = removeKeys(inputQuery, ['genre', 'searchText']);
    const genres = inputQuery.genres;

    if (inputQuery?.genres && inputQuery.genres.length > 0) {
      inputQuery['genre'] = { $in: genres };
    }

    const res = await this.bookService.searchManyAndPaginate(['title', 'desc'], inputQuery);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const res = await this.bookService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }
}
