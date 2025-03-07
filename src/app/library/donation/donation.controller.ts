import { PaginatedRes } from '@/common/types/common.types.dto';
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
import { DonationService } from './donation.service';
import {
  CreateDonationInput,
  DonationFilter,
  DonationQuery,
  UpdateDonationDto,
} from './entities/donation.dto';

import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { Request } from 'express';
import { BookService } from '../book/book.service';
import { Donation } from './entities/donation.entity';

import { UserService } from '../../account/users';

import { Endpoint } from '@/common/constants/model.names';
import { errCode } from '@/common/constants/response.consts';
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

    createDto.donorName = `${usr.body.firstName} ${usr.body.lastName}`;
    createDto.instanceNo = (book.body.instanceCnt || 0) + 1;
    createDto.bookName = book.body.title;
    createDto.bookImg = book.body.upload;
    if (book.body.uid) createDto.uid = `${book.body.uid}-${createDto.instanceNo}`;

    const resp = await this.donationService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);

    const instanceCnt = await this.donationService.countDoc({ bookId: createDto.bookId });
    if (!instanceCnt.ok) throw new HttpException(instanceCnt.errMessage, instanceCnt.code);

    const dontedCnt = await this.donationService.countDoc({ donorId: createDto.donorId });
    if (!dontedCnt.ok) throw new HttpException(dontedCnt.errMessage, dontedCnt.code);

    await this.bookService.updateOneAndReturnCount(
      { _id: createDto.bookId },
      { instanceCnt: instanceCnt.body, availableCnt: book.body.availableCnt + 1 },
    );
    await this.userService.updateOneAndReturnCount(
      { _id: createDto.donorId },
      { donatedCount: dontedCnt.body },
    );
    return resp.body;
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
    return res.body;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async removeOne(@Req() req: Request, @Param('id') id: string) {
    const res = await this.donationService.findOneAndRemove({ _id: id });
    if (!res.ok) throw new HttpException(res.errMessage, res.code);

    const ctg = await this.bookService.updateOneAndReturnCount(
      { _id: res.body.bookId },
      { $inc: { instanceCnt: -1 } },
    );
    const donor = await this.userService.updateOneAndReturnCount(
      { _id: res.body.donorId },
      { $inc: { donatedCount: -1 } },
    );

    return res.body;
  }

  //=   ========  the below queries dont need authentication

  @Get()
  async filterManyAndPaginate(@Query() inputQuery: DonationQuery): Promise<PaginatedRes<Donation>> {
    const res = await this.donationService.searchManyAndPaginate(
      ['donorName', 'bookName'],
      inputQuery,
      DonationFilter,
    );
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const res = await this.donationService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }
}
