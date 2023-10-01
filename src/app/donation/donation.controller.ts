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
import { CreateDonationInput, DonationQuery, UpdateDonationDto } from './dto/donation.dto';
import { PaginatedRes, RoleType, UserFromToken } from '../../common/common.types.dto';

import { Donation } from './entities/donation.entity';
import { JwtGuard } from '../../providers/guards/guard.rest';
import { Request } from 'express';
import { Roles } from '../../providers/guards/roles.decorators';
import { BookService } from '../book/book.service';

import { UserService } from '../users';

import { errCode } from '../../common/constants/error.constants';
import { Endpoint } from '../../common/constants/modelConsts';

@Controller(Endpoint.Donation)
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
    const usr = await this.userService.findById(createDto.donorId);
    if (!usr.ok) throw new HttpException(usr.errMessage, errCode.USER_NOT_FOUND);

    const book = await this.bookService.findById(createDto.bookId);
    if (!book.ok) throw new HttpException(usr.errMessage, errCode.NOT_FOUND);

    createDto.donorId = usr.val._id;
    createDto.donorName = `${usr.val.firstName} ${usr.val.lastName}`;
    createDto.instanceNo = book.val.instanceCount + 1;

    const resp = await this.donationService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    const ctg = await this.bookService.updateOneAndReturnCount(
      { _id: createDto.bookId },
      { $inc: { instanceCount: 1 } },
    );
    const donor = await this.userService.updateOneAndReturnCount(
      { _id: createDto.bookId },
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
      { $inc: { instanceCount: -1 } },
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
