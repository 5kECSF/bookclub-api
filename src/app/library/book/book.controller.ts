import { PaginatedRes, RoleType, UserFromToken } from '@/common/common.types.dto';
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
import { ActivateBookInput, BookQuery, CreateBookInput, UpdateBookDto } from './entities/book.dto';

import { EmbedUpload, UploadModel } from '@/app/upload/upload.entity';
import { UploadService } from '@/app/upload/upload.service';
import { Endpoint } from '@/common/constants/model.consts';
import { generateSlug } from '@/common/util/functions';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CategoryService } from '../category/category.service';
import { GenreService } from '../genres/genre.service';
import { Book, BookFilter, BookStatus } from './entities/book.entity';
import { SequenceService } from './sequence/sequence.entity';
import { logTrace } from './imports.book';
import { Resp } from '@/common/constants/return.consts';
import { ColorEnums } from '@/common/logger';

export const JsonRes=(res: Response, resp: Resp<any>)=>{
  logTrace(resp.code, resp.message, ColorEnums.FgGreen, 3)
  return res.status(resp.code).json(resp);
}
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
    const draftImg = await this.uploadService.CreateDraftImg(user._id);
    createDto.slug = generateSlug(createDto.title);
    createDto.fileId = draftImg.body._id.toString();
    createDto.status = BookStatus.Draft;
    createDto.uid = await this.sequenceService.getNextSequenceValue();
    // logTrace('creating book', createDto.title);
    const resp = await this.bookService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    return resp.body;
  }

  @Post(':id')
  // @Roles(RoleType.ADMIN, RoleType.USER)
  @UseGuards(JwtGuard)
  async activateBook(
    @Req() req: Request,
    @Body() createDto: ActivateBookInput,
    @Param('id') id: string,
  ): Promise<Book> {
    const user: UserFromToken = req['user'];
    //find the book
    const book = await this.bookService.findById(id)
    if (!book.ok) throw new HttpException(book.errMessage, book.code);
    //update the images model & ref id
    const updateImg = await this.uploadService.findOneAndUpdate(
      {
        _id: book.body.fileId,
        //TODO, this is for testing, remove in production, also use the groupId
        // model: UploadModel.NotAssigned,
        //userId: user._id,
      },
      {
        model: UploadModel.Book,
        refId: id,
      },
    );
    if (!updateImg.ok) throw new HttpException(updateImg.errMessage, updateImg.code);
    
    
    const upload: EmbedUpload = {
      fileName: updateImg.body.fileName,
      pathId: updateImg.body.pathId,
      uid: updateImg.body.uid,
      images: updateImg.body.images,
    };
    const resp = await this.bookService.findOneAndUpdate(
      { _id: id },
      { status: BookStatus.Active, upload: upload },
    );
    if (!resp.ok || resp.body == null) throw new HttpException(resp.errMessage, resp.code);

    
    //===============>>     TODO: update this using count, to make it always accurate
    await Promise.all([
      this.categoryService.updateOneAndReturnCount(
        { _id: resp.body.categoryId },
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
      logTrace("", resp.errMessage)
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
    const result = await this.uploadService.deleteFileById(res.body.fileId);
    if (!result.ok) throw new HttpException(result.errMessage, result.code);

    await Promise.all([
      this.categoryService.updateOneAndReturnCount(
        { _id: res.body.categoryId },
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
