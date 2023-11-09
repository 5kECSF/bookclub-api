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
import { BorrowQuery, CreateBorrowInput, UpdateDto } from './entities/borrow.dto';
import { PaginatedRes, RoleType, UserFromToken } from '../../common/common.types.dto';

import { Borrow, BorrowStatus } from './entities/borrow.entity';
import { JwtGuard } from '../../providers/guards/guard.rest';
import { Roles } from '../../providers/guards/roles.decorators';
import { Endpoint } from '../../common/constants/model.consts';
import { Request } from 'express';
import { BookService } from '../book/book.service';
import { UserService } from '../users';
import { errCode } from '../../common/constants/response.consts';
import { NotificationService } from '../notification/notification.service';

@Controller(Endpoint.Borrow)
export class BorrowController {
  constructor(
    private readonly service: BorrowService,
    private readonly bookService: BookService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
  ) {}

  @Post('/request/:bookId')
  @UseGuards(JwtGuard)
  async requestBorrow(@Req() req: Request, @Param('bookId') id: string): Promise<Borrow> {
    const user: UserFromToken = req['user'];
    const usr = await this.userService.findById(user._id);
    if (!usr.ok) throw new HttpException(usr.errMessage, errCode.USER_NOT_FOUND);
    const book = await this.bookService.findById(id);
    if (!book.ok) throw new HttpException(usr.errMessage, errCode.NOT_FOUND);

    const createDto: CreateBorrowInput = {
      status: BorrowStatus.WaitList,
      userId: user._id,
      bookId: id,
      bookName: book.val.title,
      userName: `${usr.val.firstName} ${usr.val.lastName}`,
    };

    const resp = await this.service.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    // TODO: send notification to admin here
    return resp.val;
  }

  @Post('/cancle/:id')
  @UseGuards(JwtGuard)
  async cancelRequest(@Req() req: Request, @Param('id') id: string): Promise<any> {
    const user: UserFromToken = req['user'];
    const res = await this.service.deleteOne({
      userId: user._id,
      _id: id,
      status: BorrowStatus.WaitList,
    });
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    // TODO: send notification to admin here
    return res.val;
  }

  @Post('/acceptBorrow/:id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async acceptBorrow(@Param('id') id: string): Promise<Borrow> {
    const resp = await this.service.updateById(id, { status: BorrowStatus.Accepted });
    // const resp = await this.service.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    //TODO: SEND NOTIFICATION MESSAGE HERE TO the User, it could also be an email
    // TODO: add a custom message to it `you can take the book on ....day @ ...place`
    return resp.val;
  }

  @Post('/markTaken/:id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async markTaken(@Param('id') id: string): Promise<Borrow> {
    //TODO: Add taken date here
    //TODO: update the instance & book count
    const resp = await this.service.updateById(id, { status: BorrowStatus.Taken });
    // const resp = await this.service.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    //TODO: SEND NOTIFICATION MESSAGE HERE TO the User, you have borrowed a book & return date is ...
    return resp.val;
  }

  @Post('/markReturned/:id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async markReturned(@Param('id') id: string): Promise<Borrow> {
    //TODO: Add taken date here
    //TODO: update the instance & book count
    const resp = await this.service.updateById(id, { status: BorrowStatus.Returned });
    // const resp = await this.service.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    //TODO: SEND NOTIFICATION MESSAGE HERE TO the User, you have borrowed a book & return date is ...
    return resp.val;
  }

  @Post()
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async createOne(@Body() createDto: CreateBorrowInput): Promise<Borrow> {
    const resp = await this.service.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.val;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async update(@Param('id') id: string, @Body() updateDto: UpdateDto) {
    const res = await this.service.updateById(id, updateDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id') id: string) {
    const res = await this.service.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  // == below queries dont need authentication
  @Get()
  async filterAndPaginate(@Query() inputQuery: BorrowQuery): Promise<PaginatedRes<Borrow>> {
    const res = await this.service.searchManyAndPaginate(['userName'], inputQuery);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const res = await this.service.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }
}
