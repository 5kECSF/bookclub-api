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
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserService } from '../../account/users';
import { NotificationEnum } from '../../extra/notification/entities/notification.entity';
import { NotificationService } from '../../extra/notification/notification.service';
import { BookService } from '../book/book.service';
import { DonationService } from '../donation/donation.service';
import { bookStatus } from '../donation/entities/donation.entity';
import {
  BookReturned,
  BookTaken,
  Borrow,
  BorrowAccept,
  BorrowStatus,
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
      bookName: book.body.title,
      userName: `${usr.body.firstName} ${usr.body.lastName}`,
    };

    const resp = await this.borrowService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    return resp.body;
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

    return res.body;
  }

  @Post('/acceptBorrow/:id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async acceptBorrow(@Param('id') id: string, @Body() message: BorrowAccept): Promise<Borrow> {
    const instance = await this.donationService.findById(message.instanceId);
    if (!instance.ok) throw new HttpException(instance.errMessage, instance.code);

    const resp = await this.borrowService.updateById(id, {
      status: BorrowStatus.Accepted,
      instanceUid: instance.body.uid,
      instanceId: message.instanceId,
    });
    /**
     * mark the instance book as reserved and update the id of the user who have taken it
     */
    const updateInstance = await this.donationService.updateById(message.instanceId, {
      status: bookStatus.Reserved,
      borrowerId: resp.body.userId,
      borrowerName: resp.body.userName,
    });
    const updateBook = await this.bookService.updateById(resp.body.bookId, {
      $inc: { availableCnt: -1 },
    });
    // const resp = await this.service.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    const notification = await this.notificationService.createOne({
      title: `Your request to borrow ${resp.body.bookName} have been accepted`,
      body: message.body,
      type: NotificationEnum.Individual,
      userId: resp.body.userId,
    });
    //TODO: add email notifications

    return resp.body;
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
    const updateInstance = await this.donationService.updateById(resp.body.instanceId, {
      status: bookStatus.Taken,
    });
    if (!updateInstance.ok) throw new HttpException(resp.errMessage, resp.code);

    const notification = await this.notificationService.createOne({
      title: `The ${resp.body.bookName} book is marked as taken by you`,
      body: `The book ${resp.body.bookName} has been marked as taken by You. if it is a mistake, contact us`,
      type: NotificationEnum.Individual,
      userId: resp.body.userId,
    });

    return resp.body;
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
    const updateBook = await this.bookService.updateById(resp.body.bookId, {
      $inc: { availableCnt: 1 },
    });
    // const resp = await this.service.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    //TODO: SEND NOTIFICATION MESSAGE HERE TO the User, you have borrowed a book & return date is ...
    return resp.body;
  }

  @Post()
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async createOne(@Body() createDto: CreateBorrowInput): Promise<Borrow> {
    const resp = await this.borrowService.createOne(createDto);
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

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id') id: string) {
    const res = await this.borrowService.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  // == below queries dont need authentication
  @Get()
  async filterAndPaginate(@Query() inputQuery: BorrowQuery): Promise<PaginatedRes<Borrow>> {
    const res = await this.borrowService.searchManyAndPaginate(
      ['userName'],
      inputQuery,
      BorrowFilter,
    );
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const res = await this.borrowService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }
}
