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
import { BookService } from './book.service';
import { BookQuery, CreateBookInput, UpdateBookDto } from './entities/book.dto';
import { PaginatedRes, RoleType, UserFromToken } from '@/common/common.types.dto';

import { Book } from './entities/book.entity';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Request } from 'express';
import { Roles } from '@/providers/guards/roles.decorators';
import { GenreService } from '../genres/genre.service';
import { CategoryService } from '../category/category.service';
import { generateSlug } from '@/common/util/functions';
import { FileProviderService } from '@/app/upload/file-provider.service';
import { logTrace } from '@/common/logger';
import { removeKeys } from '@/common/util/util';
import { SequenceService } from './sequence/sequence.entity';
import { UploadService } from '@/app/upload/upload.service';
import { ApiTags } from '@nestjs/swagger';
import { Endpoint } from '@/common/constants/model.consts';
import { UploadModel } from '@/app/upload/upload.entity';

@Controller(Endpoint.Book)
@ApiTags(Endpoint.Book)
export class BookController {
  constructor(
    private readonly bookService: BookService,
    private readonly genreService: GenreService,
    private readonly categoryService: CategoryService,
    private fileService: FileProviderService,
    private readonly sequenceService: SequenceService,
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async createOne(@Req() req: Request, @Body() createDto: CreateBookInput): Promise<Book> {
    const user: UserFromToken = req['user'];
    const img = await this.uploadService.findById(createDto.fileId);
    if (!img.ok) throw new HttpException(img.errMessage, img.code);

    createDto.upload = img.val;
    createDto.slug = generateSlug(createDto.title);
    createDto.uid = await this.sequenceService.getNextSequenceValue();
    // logTrace('creating book', createDto.title);
    const resp = await this.bookService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    const updateImg = await this.uploadService.findOneAndUpdate(
      {
        _id: createDto.fileId,
        // model: UploadModel.NotAssigned,
      },
      {
        model: UploadModel.Book,
        refId: resp.val._id,
      },
    );
    if (!updateImg.ok) throw new HttpException(updateImg.errMessage, updateImg.code);

    await Promise.all([
      this.categoryService.updateOneAndReturnCount(
        { _id: createDto.categoryId },
        { $inc: { count: 1 } },
      ),
      this.genreService.updateMany({ name: { $in: createDto.genres } }, { $inc: { count: 1 } }),
    ]);

    return resp.val;
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async update(@Req() req: Request, @Param('id') id: string, @Body() updateBookDto: UpdateBookDto) {
    const user: UserFromToken = req['user'];
    const book = await this.bookService.findById(id);
    if (!book.ok) throw new HttpException(book.errMessage, book.code);
    /**
     * if there is change on the image
     */
    if (updateBookDto?.fileUpdated || updateBookDto.fileId) {
      const file = await this.uploadService.findById(book.val.upload._id);
      if (!file.ok) throw new HttpException(file.errMessage, file.code);
      updateBookDto.upload = file.val;
    }

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
    const result = await this.uploadService.deleteFileById(res.val.fileId);
    if (!result.ok) throw new HttpException(result.errMessage, result.code);

    await Promise.all([
      this.categoryService.updateOneAndReturnCount(
        { _id: res.val.categoryId },
        { $inc: { count: -1 } },
      ),
      this.genreService.updateMany({ name: { $in: res.val.genres } }, { $inc: { count: -1 } }),
    ]);

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
    let genres = inputQuery.genres;
    if (genres && !Array.isArray(genres)) {
      // If `tags` is not an array, convert it to a single-element array.
      genres = [genres];
    }
    logTrace('query', inputQuery);
    const query = removeKeys(inputQuery, ['genres', 'searchText']);
    if (inputQuery?.genres && inputQuery.genres.length > 0) {
      query['genres'] = { $in: genres };
    }
    logTrace('input q', query);

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
