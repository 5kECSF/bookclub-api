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
import { Request } from 'express';
import { CategoryService } from '../category/category.service';
import { GenreService } from '../genres/genre.service';
import { Book, BookFilter } from './entities/book.entity';

import { parseBool } from '@/common/util/object-functions';
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
  @Roles(RoleType.ADMIN)
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
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async activateBook(@Param('id') id: string): Promise<Book> {
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

    // category/genre counts are recomputed (re-activating used to double count)
    await this.bookService.recomputeTaxonomyCounts([resp.body.categoryName], resp.body.genres);

    return resp.body;
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async update(@Param('id') id: string, @Body() updateBookDto: UpdateBookDto): Promise<Book> {
    const bookResp = await this.bookService.findById(id);
    if (!bookResp.ok) {
      // return res.status(bookResp.code).json(bookResp);
      ThrowRes(bookResp);
    }
    /**
     * if there is change on the image
     */
    const { fileUpdated, ...update } = updateBookDto;
    if (fileUpdated || update.fileId) {
      const file = await this.uploadService.findById(bookResp.body.fileId);
      if (!file.ok) throw new HttpException(file.errMessage, file.code);
      update.upload = file.body;
    }
    // the file id is managed by the draft/upload flow
    delete update.fileId;
    const resp = await this.bookService.findOneAndUpdate({ _id: id }, update);
    if (!resp.ok) {
      logTrace('', resp.errMessage);
      ThrowRes(resp);
    }
    await this.bookService.recomputeTaxonomyCounts(
      [bookResp.body.categoryName, resp.body.categoryName],
      [...(bookResp.body.genres || []), ...(resp.body.genres || [])],
    );
    return resp.body;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async removeOne(@Req() req: Request, @Param('id') id: string): Promise<Book> {
    const res = await this.bookService.removeOne(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
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
    let metas = inputQuery.meta;
    if (genres && !Array.isArray(genres)) {
      // If `tags` is not an array, convert it to a single-element array.
      genres = [genres];
    }
    if (metas && !Array.isArray(metas)) {
      metas = [metas];
    }
    // logTrace('query', inputQuery);
    const additionalQuery = {};
    if (genres && genres.length > 0) {
      additionalQuery['genres'] = { $in: genres };
    }
    if (metas && metas.length > 0) {
      additionalQuery['meta'] = { $in: metas };
    }
    if (parseBool(inputQuery.inStore) === true) {
      additionalQuery['availableCnt'] = { $gt: 0 };
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
