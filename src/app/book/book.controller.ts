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
} from '@nestjs/common';
import { BookService } from './book.service';
import { BookQuery, CreateBookInput, UpdateBookDto } from './dto/book.dto';
import { pagiKeys, PaginatedRes, RoleType } from '../../common/common.types.dto';

import { pickKeys, removeKeys } from '../../common/util/util';
import { Book } from './entities/book.entity';
import { JwtGuard } from '../../providers/guards/guard.rest';
import { UserFromToken } from '../../common/common.types.dto';
import { Request } from 'express';
import { Roles } from '../../providers/guards/roles.decorators';
import { GenreService } from '../genre/genre.service';
import { CategoryService } from '../category/category.service';
import { ColorEnums, logTrace } from '../../common/logger';
import { UserService } from '../users';
import { errCode } from '../../common/constants/error.constants';
import { generateSlug } from '../../common/util/functions';

@Controller('book')
export class BookController {
  constructor(
    private readonly bookService: BookService,
    private readonly genreService: GenreService,
    private readonly categoryService: CategoryService,
  ) {}

  @Post()
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  @Roles(RoleType.ADMIN)
  async createOne(@Req() req: Request, @Body() createDto: CreateBookInput): Promise<Book> {
    createDto.slug = generateSlug(createDto.title);

    const resp = await this.bookService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    const ctg = await this.categoryService.updateOneAndReturnCount(
      { _id: createDto.categoryId },
      { $inc: { count: 1 } },
    );
    const tag = await this.genreService.updateMany(
      { name: { $in: createDto.genre } },
      { $inc: { count: 1 } },
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
      { name: { $in: res.val.genres } },
      { $inc: { count: -1 } },
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
