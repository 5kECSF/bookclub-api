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
import { BorrowService } from './borrow.service';
import { BorrowFilter, BorrowQuery, CreateBorrowInput, UpdateDto } from './entities/borrow.dto';

import { Endpoint } from '@/common/constants/model.names';
import { errCode } from '@/common/constants/response.consts';
import { Resp } from '@/common/constants/return.consts';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserService } from '../../account/users';
import { NotificationService } from '../../extra/notification/notification.service';
import { BookService } from '../book/book.service';
import { DonationService } from '../donation/donation.service';
import { parseBool } from '@/common/util/object-functions';
import {
  BookReturned,
  BookTaken,
  Borrow,
  BorrowAccept,
  BorrowStatus,
  RemoveBorrowInput,
} from './entities/borrow.entity';

@Controller(Endpoint.Borrow)
@ApiTags(Endpoint.Borrow)
export class BorrowController {
  constructor(
    private readonly borrowService: BorrowService,
    private readonly bookService: BookService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly donationService: DonationService,
  ) {}

  @Post('/request/:bookId')
  @UseGuards(JwtGuard)
  async requestBorrow(@Req() req: Request, @Param('bookId') id: string): Promise<Resp<Borrow>> {
    const user: UserFromToken = req['user'];
    const resp = await this.borrowService.RequestBorrow(id, user._id);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp;
  }

  // `/cancle/` is the historical (misspelled) route used by the frontend, `/cancel/` is an alias
  @Post(['/cancle/:borrowId', '/cancel/:borrowId'])
  @UseGuards(JwtGuard)
  async cancelRequest(@Req() req: Request, @Param('borrowId') id: string): Promise<Resp<Borrow>> {
    const user: UserFromToken = req['user'];
    const resp = await this.borrowService.cancleRequest(id, user._id);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp;
  }

  @Post('/acceptBorrow/:id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async acceptBorrow(
    @Param('id') id: string,
    @Body() message: BorrowAccept,
  ): Promise<Resp<Borrow>> {
    // return this.borrowService.acceptBorrow(id, message);
    const resp = await this.borrowService.AcceptBorrow(id, message);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp;
  }

  @Post('/markTaken/:id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async markTaken(@Param('id') id: string, @Body() body: BookTaken): Promise<Resp<Borrow>> {
    const resp = await this.borrowService.MarkTaken(id, body);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp;
  }

  @Post('/markReturned/:id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async markReturned(@Param('id') id: string, @Body() body: BookReturned): Promise<Borrow> {
    const resp = await this.borrowService.MarkReturned(id, body);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.body;
  }

  //===================  Generice Functions ============

  @Post()
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async createOne(@Body() createDto: CreateBorrowInput): Promise<Borrow> {
    const usr = await this.userService.findById(createDto.userId);
    if (!usr.ok) throw new HttpException(usr.errMessage, errCode.USER_NOT_FOUND);
    const book = await this.bookService.findById(createDto.bookId);
    if (!book.ok) throw new HttpException(book.errMessage, errCode.NOT_FOUND);

    const instance = await this.donationService.findById(createDto.instanceId);
    if (!instance.ok) throw new HttpException(instance.errMessage, errCode.NOT_FOUND);
    if (String(instance.body.bookId) !== String(book.body._id))
      throw new HttpException('The selected copy belongs to another book', 400);

    const createData: CreateBorrowInput = {
      ...createDto,
      bookName: book.body.title,
      userName: usr.body.fullName,
      instanceId: instance.body._id,
      instanceUid: instance.body.uid,
    };
    const resp = await this.borrowService.createOne(createData);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.body;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async update(@Param('id') id: string, @Body() updateDto: UpdateDto) {
    const res = await this.borrowService.updateById(id, updateDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  /**
   * admin rejects/removes a borrow (see BorrowService.RemoveBorrow):
   * WAITLIST -> rejected (pulled from user.requestedBooks, user notified),
   * ACCEPTED -> reservation cancelled (copy released), RETURNED -> deleted, BORROWED -> 409
   * `POST /borrow/reject/:id` is an alias that accepts an optional `{ note }`
   */
  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id') id: string) {
    const res = await this.borrowService.RemoveBorrow(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Post('/reject/:id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async reject(@Param('id') id: string, @Body() body: RemoveBorrowInput) {
    const res = await this.borrowService.RemoveBorrow(id, body?.note);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Get()
  @UseGuards(JwtGuard)
  async filterAndPaginate(
    @Req() req: Request,
    @Query() inputQuery: BorrowQuery,
  ): Promise<PaginatedRes<Borrow>> {
    const user: UserFromToken = req['user'];
    const additinalQuery: Record<string, any> = {};
    // normal users only ever see their own borrows
    if (user.role != RoleType.ADMIN) {
      additinalQuery['userId'] = user._id;
    }
    // merged with (it used to replace) the user restriction; overdue = still borrowed & past due
    if (parseBool(inputQuery.overDue) === true) {
      additinalQuery['status'] = BorrowStatus.Borrowed;
      additinalQuery['dueDate'] = { $lt: new Date() };
    }

    const res = await this.borrowService.searchManyAndPaginate(
      ['userName', 'instanceId'],
      inputQuery,
      BorrowFilter,
      additinalQuery,
    );
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Get(':id')
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async findOne(@Param('id') id: string): Promise<Borrow> {
    const res = await this.borrowService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }
}
