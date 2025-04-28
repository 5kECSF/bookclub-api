import { PaginatedRes, UserFromToken } from '@/common/types/common.types.dto';
import { RoleType } from '@/common/types/enums';
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
  Res,
  UseGuards,
} from '@nestjs/common';
import { BookService } from './book.service';
import { BookQuery, CreateBookInput, UpdateBookDto } from './entities/book.dto';

import { EmbedUpload, UploadModel, UploadStatus } from '@/app/upload/upload.entity';
import { UploadService } from '@/app/upload/upload.service';
import { Endpoint } from '@/common/constants/model.names';
import { logTrace } from '@/common/logger';
import { ItemStatus } from '@/common/types/enums';
import { generateSlug } from '@/common/util/random-functions';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CategoryService } from '../category/category.service';
import { GenreService } from '../genres/genre.service';
import { Book, BookFilter } from './entities/book.entity';

import { ThrowRes } from '@/common/util/responseFunctions';
import { SequenceService } from './sequence/sequence.entity';

@Controller(Endpoint.Book)
@ApiTags(Endpoint.Book)
export class BookController {
  constructor(
    private readonly bookService: BookService,
    private readonly genreService: GenreService,
    private readonly categoryService: CategoryService,
    private readonly sequenceService: SequenceService,
    private readonly uploadService: UploadService,
  ) {}

  @Post()
  @Roles(RoleType.ADMIN, RoleType.USER)
  @UseGuards(JwtGuard)
  async createOne(@Req() req: Request, @Body() createDto: CreateBookInput): Promise<Book> {
    const user: UserFromToken = req['user'];
    const draftImg = await this.uploadService.CreateEmptyDraftImg(user._id, UploadModel.Book);
    if (!draftImg.ok) ThrowRes(draftImg);
    createDto.slug = generateSlug(createDto.title, true);
    createDto.fileId = draftImg.body._id.toString();
    createDto.status = ItemStatus.Draft;
    createDto.uid = await this.sequenceService.getNextSequenceValue();
    // logTrace('creating book', createDto.title);
    const resp = await this.bookService.createOne(createDto);
    if (!resp.ok) ThrowRes(resp);

    return resp.body;
  }

  @Post(':id')
  // @Roles(RoleType.ADMIN, RoleType.USER)
  @UseGuards(JwtGuard)
  async activateBook(@Req() req: Request, @Param('id') id: string): Promise<Book> {
    const user: UserFromToken = req['user'];
    //find the book
    const book = await this.bookService.findById(id);
    if (!book.ok) ThrowRes(book);
    //update the images model & ref id
    const updateImg = await this.uploadService.findOneAndUpdate(
      {
        _id: book.body.fileId,
        //TODO, this is for testing, remove in production, also use the groupId
        // status: UploadModel.NotAssigned,
        //userId: user._id,
      },
      {
        status: UploadStatus.Active,
        refId: id,
      },
    );
    if (!updateImg.ok) ThrowRes(updateImg);

    const upload: EmbedUpload = {
      fileName: updateImg.body.fileName,
      pathId: updateImg.body.pathId,
      uid: updateImg.body.uid,
      images: updateImg.body.images,
      url: updateImg.body.url,
    };
    const resp = await this.bookService.findOneAndUpdate(
      { _id: id },
      { status: ItemStatus.Active, upload: upload },
    );
    if (!resp.ok || resp.body == null) ThrowRes(resp);

    //===============>>     TODO: update this using count, to make it always accurate
    await Promise.all([
      this.categoryService.updateOneAndReturnCount(
        { name: resp.body.categoryName },
        { $inc: { count: 1 } },
      ),
      this.genreService.updateMany({ name: { $in: resp.body.genres } }, { $inc: { count: 1 } }),
    ]);

    return resp.body;
  }

  @Patch(':id')
  // @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async update(
    @Req() req: Request,
    @Res() res: Response,
    @Param('id') id: string,
    @Body() updateBookDto: UpdateBookDto,
  ) {
    const user: UserFromToken = req['user'];
    const bookResp = await this.bookService.findById(id);
    if (!bookResp.ok) {
      return res.status(bookResp.code).json(bookResp);
      // throw new HttpException(res.errMessage, res.
    }
    /**
     * if there is change on the image
     */
    if (updateBookDto?.fileUpdated || updateBookDto.fileId) {
      const file = await this.uploadService.findById(bookResp.body.fileId);
      if (!file.ok) throw new HttpException(file.errMessage, file.code);
      updateBookDto.upload = file.body;
    }
    //Todo: calculate the Genres & categories Count
    const resp = await this.bookService.findOneAndUpdate({ _id: id }, updateBookDto);
    if (!resp.ok) {
      logTrace('', resp.errMessage);
      return res.status(resp.code).json(resp);
    }
    return resp.body;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async removeOne(@Req() req: Request, @Param('id') id: string): Promise<Book> {
    //TODO: iterate and remove all the files
    const res = await this.bookService.findOneAndRemove({ _id: id });
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    const result = await this.uploadService.deleteFileByIdPrefix(res.body.fileId);
    if (!result.ok) {
      console.log('deleting the file error');
    }

    await Promise.all([
      this.categoryService.updateOneAndReturnCount(
        { name: res.body.categoryName },
        { $inc: { count: -1 } },
      ),
      this.genreService.updateMany({ name: { $in: res.body.genres } }, { $inc: { count: -1 } }),
    ]);
    return res.body;
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
    // logTrace('query', inputQuery);
    const additionalQuery = {};
    if (inputQuery?.genres && inputQuery.genres.length > 0) {
      additionalQuery['genres'] = { $in: genres };
    }

    const res = await this.bookService.searchManyAndPaginate(
      ['title', 'desc'],
      inputQuery,
      BookFilter,
      additionalQuery,
    );
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const res = await this.bookService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }
}
