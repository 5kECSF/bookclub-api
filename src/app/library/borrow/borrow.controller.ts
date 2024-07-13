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
import { PaginatedRes, RoleType, UserFromToken } from '@/common/common.types.dto';

import {
  BorrowAccept,
  BookReturned,
  BookTaken,
  Borrow,
  BorrowStatus,
} from './entities/borrow.entity';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { Endpoint } from '@/common/constants/model.consts';
import { Request } from 'express';
import { BookService } from '../book/book.service';
import { UserService } from '../../account/users';
import { errCode } from '@/common/constants/response.consts';
import { NotificationService } from '../../extra/notification/notification.service';
import { NotificationEnum } from '../../extra/notification/entities/notification.entity';
import { DonationService } from '../donation/donation.service';
import { bookStatus } from '../donation/entities/donation.entity';
import { ApiTags } from '@nestjs/swagger';

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

    const resp = await this.borrowService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    return resp.val;
  }

  @Post('/cancle/:borrowId')
  @UseGuards(JwtGuard)
  async cancelRequest(@Req() req: Request, @Param('borrowId') id: string): Promise<any> {
    const user: UserFromToken = req['user'];
    const res = await this.borrowService.deleteOne({
      userId: user._id,
      _id: id,
      status: BorrowStatus.WaitList,
    });
    if (!res.ok) throw new HttpException(res.errMessage, res.code);

    return res.val;
  }

  @Post('/acceptBorrow/:id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async acceptBorrow(@Param('id') id: string, @Body() message: BorrowAccept): Promise<Borrow> {
    const instance = await this.donationService.findById(message.instanceId);
    if (!instance.ok) throw new HttpException(instance.errMessage, instance.code);

    const resp = await this.borrowService.updateById(id, {
      status: BorrowStatus.Accepted,
      instanceUid: instance.val.uid,
      instanceId: message.instanceId,
    });
    /**
     * mark the instance book as reserved and update the id of the user who have taken it
     */
    const updateInstance = await this.donationService.updateById(message.instanceId, {
      status: bookStatus.Reserved,
      borrowerId: resp.val.userId,
      borrowerName: resp.val.userName,
    });
    const updateBook = await this.bookService.updateById(resp.val.bookId, {
      $inc: { availableCnt: -1 },
    });
    // const resp = await this.service.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    const notification = await this.notificationService.createOne({
      title: `Your request to borrow ${resp.val.bookName} have been accepted`,
      body: message.body,
      type: NotificationEnum.Individual,
      userId: resp.val.userId,
    });
    //TODO: add email notifications

    return resp.val;
  }

  @Post('/markTaken/:id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async markTaken(@Param('id') id: string, @Body() body: BookTaken): Promise<Borrow> {
    const resp = await this.borrowService.updateById(id, {
      status: BorrowStatus.Taken,
      takenDate: body.takenDate,
      dueDate: body.dueDate,
      note: body.note,
    });
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    const updateInstance = await this.donationService.updateById(resp.val.instanceId, {
      status: bookStatus.Taken,
    });
    if (!updateInstance.ok) throw new HttpException(resp.errMessage, resp.code);

    const notification = await this.notificationService.createOne({
      title: `The ${resp.val.bookName} book is marked as taken by you`,
      body: `The book ${resp.val.bookName} has been marked as taken by You. if it is a mistake, contact us`,
      type: NotificationEnum.Individual,
      userId: resp.val.userId,
    });

    return resp.val;
  }

  @Post('/markReturned/:id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async markReturned(@Param('id') id: string, @Body() body: BookReturned): Promise<Borrow> {
    //TODO: Add taken date here
    //TODO: update the instance & book count
    const resp = await this.borrowService.updateById(id, {
      status: BorrowStatus.Returned,
      returnedDate: body.returnedDate,
    });
    const updateBook = await this.bookService.updateById(resp.val.bookId, {
      $inc: { availableCnt: 1 },
    });
    // const resp = await this.service.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    //TODO: SEND NOTIFICATION MESSAGE HERE TO the User, you have borrowed a book & return date is ...
    return resp.val;
  }

  @Post()
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async createOne(@Body() createDto: CreateBorrowInput): Promise<Borrow> {
    const resp = await this.borrowService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.val;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async update(@Param('id') id: string, @Body() updateDto: UpdateDto) {
    const res = await this.borrowService.updateById(id, updateDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id') id: string) {
    const res = await this.borrowService.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  // == below queries dont need authentication
  @Get()
  async filterAndPaginate(@Query() inputQuery: BorrowQuery): Promise<PaginatedRes<Borrow>> {
    const res = await this.borrowService.searchManyAndPaginate(['userName'], inputQuery);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const res = await this.borrowService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }
}
