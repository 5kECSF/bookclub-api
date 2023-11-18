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
  UploadedFiles,
  UseGuards,
} from '@nestjs/common';
import { BookService } from './book.service';
import { BookQuery, CreateBookInput, UpdateBookDto } from './entities/book.dto';
import { PaginatedRes, RoleType, UserFromToken } from '../../common/common.types.dto';

import { Book } from './entities/book.entity';
import { JwtGuard } from '../../providers/guards/guard.rest';
import { Express, Request } from 'express';
import { Roles } from '../../providers/guards/roles.decorators';
import { GenreService } from '../genres/genre.service';
import { CategoryService } from '../category/category.service';

import { generateSlug, removeSubArr } from '../../common/util/functions';

import { FileService } from '../file/file.service';
import { ApiManyFiltered } from '../file/fileParser';
import { logTrace } from '../../common/logger';
import { MaxImageSize } from '../../common/constants/system.consts';
import { removeKeys } from '../../common/util/util';
import { FAIL } from '../../common/constants/return.consts';
import { SequenceService } from './sequence/sequence.entity';

@Controller('book')
export class BookController {
  constructor(
    private readonly bookService: BookService,
    private readonly genreService: GenreService,
    private readonly categoryService: CategoryService,
    private fileService: FileService,
    private readonly sequenceService: SequenceService,
  ) {}

  @Post()
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  @ApiManyFiltered('cover', 'images', 3, MaxImageSize)
  async createOne(
    @Req() req: Request,
    @Body() createDto: CreateBookInput,
    @UploadedFiles() files: { cover?: Express.Multer.File[]; images?: Express.Multer.File[] },
  ): Promise<Book> {
    const imageObj = await this.fileService.ControllerUploadCoverAndImages(files);
    if (!imageObj.ok) throw new HttpException(imageObj.errMessage, imageObj.code);

    createDto.img = imageObj.val;
    createDto.slug = generateSlug(createDto.title);
    createDto.uid = await this.sequenceService.getNextSequenceValue();
    // logTrace('creating book', createDto.title);
    const resp = await this.bookService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

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
  @ApiManyFiltered('cover', 'images', 3, MaxImageSize)
  async update(
    @UploadedFiles() files: { cover?: Express.Multer.File[]; images?: Express.Multer.File[] },
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateBookDto: UpdateBookDto,
  ) {
    const book = await this.bookService.findById(id);
    if (!book.ok) throw new HttpException(book.errMessage, book.code);
    /**
     * if the cover image has changed
     */

    if (files.cover && files.cover.length > 0) {
      logTrace('Updating Cover', files.cover.length);
      const result = await this.fileService.IUploadSingleImage(
        files.cover[0].buffer,
        book.val.img.image,
      );
    }
    /**
     * if images have been removed
     */
    if (updateBookDto.removedImages) {
      if (!Array.isArray(updateBookDto.removedImages))
        updateBookDto.removedImages = [updateBookDto.removedImages];
      await Promise.all(
        updateBookDto.removedImages.map(async (fileName, i) => {
          if (book.val.img.images.includes(fileName)) {
            const result = await this.fileService.IDeleteImageById(fileName);
            if (!result.ok) throw new HttpException(result.errMessage, result.code);
          }
        }),
      );
      book.val.img.images = removeSubArr(book.val.img.images, updateBookDto.removedImages);
    }
    /**
     * If Images have been added
     */
    if (files.images && files.images.length > 0) {
      const tot = files.images.length + book.val.img.images.length;
      if (tot > 3) throw new HttpException('Image Numbers Exceeded', 400);
      const images = await this.fileService.uploadManyWithNewNames(files.images, book.val.img.uid);
      if (!images.ok) return FAIL(images.errMessage, images.code);
      book.val.img.images = [...book.val.img.images, ...images.val];
    }
    updateBookDto.img = book.val.img;
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

    const result = await this.fileService.IDeleteImageById(res.val.img.uid);
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
