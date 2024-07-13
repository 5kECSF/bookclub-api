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
import { DonationService } from './donation.service';
import { CreateDonationInput, DonationQuery, UpdateDonationDto } from './entities/donation.dto';
import { PaginatedRes, RoleType } from '@/common/common.types.dto';

import { Donation } from './entities/donation.entity';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Request } from 'express';
import { Roles } from '@/providers/guards/roles.decorators';
import { BookService } from '../book/book.service';

import { UserService } from '../../account/users';

import { errCode } from '@/common/constants/response.consts';
import { Endpoint } from '@/common/constants/model.consts';
import { ApiTags } from '@nestjs/swagger';

@Controller(Endpoint.Donation)
@ApiTags(Endpoint.Donation)
export class DonationController {
  constructor(
    private readonly donationService: DonationService,
    private readonly bookService: BookService,
    private readonly userService: UserService,
  ) {}

  @Post()
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async createOne(@Req() req: Request, @Body() createDto: CreateDonationInput): Promise<Donation> {
    // const user: UserFromToken = req['user'];
    // createDto.userName=user.f
    // logTrace('input', createDto, ColorEnums.BgCyan);
    const usr = await this.userService.findById(createDto.donorId);
    if (!usr.ok) throw new HttpException(usr.errMessage, errCode.USER_NOT_FOUND);

    const book = await this.bookService.findById(createDto.bookId);
    if (!book.ok) throw new HttpException(usr.errMessage, errCode.NOT_FOUND);

    createDto.donorName = `${usr.val.firstName} ${usr.val.lastName}`;
    createDto.instanceNo = (book.val.instanceCnt || 0) + 1;
    createDto.bookName = book.val.title;
    createDto.bookImg = book.val.upload;
    if (book.val.uid) createDto.uid = `${book.val.uid}-${createDto.instanceNo}`;

    const resp = await this.donationService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    const ctg = await this.bookService.updateOneAndReturnCount(
      { _id: createDto.bookId },
      { $inc: { instanceCnt: 1, availableCnt: 1 } },
    );
    const donor = await this.userService.updateOneAndReturnCount(
      { _id: createDto.donorId },
      { $inc: { donatedCount: 1 } },
    );
    return resp.val;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateDonationDto: UpdateDonationDto,
  ) {
    /**
     * TODO
     * if book id is updated, update books instance count
     * if user id is updated update users donated count
     */
    const res = await this.donationService.findOneAndUpdate({ _id: id }, updateDonationDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async removeOne(@Req() req: Request, @Param('id') id: string) {
    const res = await this.donationService.findOneAndRemove({ _id: id });
    if (!res.ok) throw new HttpException(res.errMessage, res.code);

    const ctg = await this.bookService.updateOneAndReturnCount(
      { _id: res.val.bookId },
      { $inc: { instanceCnt: -1 } },
    );
    const donor = await this.userService.updateOneAndReturnCount(
      { _id: res.val.donorId },
      { $inc: { donatedCount: -1 } },
    );

    return res.val;
  }

  //=   ========  the below queries dont need authentication

  @Get()
  async filterManyAndPaginate(@Query() inputQuery: DonationQuery): Promise<PaginatedRes<Donation>> {
    const res = await this.donationService.searchManyAndPaginate(
      ['donorName', 'bookName'],
      inputQuery,
    );
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const res = await this.donationService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }
}
