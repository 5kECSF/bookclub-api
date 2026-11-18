import { RoleType } from '@/common/types/enums';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { Controller, Get, HttpException, Query, UseGuards } from '@nestjs/common';
import { BorrowService } from './../borrow/borrow.service';

import { Endpoint } from '@/common/constants/model.names';
import { FilterUser, UserFilter } from '@/app/account/users/entities/user.dto';
import { PaginatedRes } from '@/common/types/common.types.dto';
import { ApiTags } from '@nestjs/swagger';
import { User, UserService } from '../../account/users';
import { NotificationService } from '../../extra/notification/notification.service';
import { BookService } from '../book/book.service';
import { BorrowStatus } from '../borrow/entities/borrow.entity';
import { DonationService } from '../donation/donation.service';

interface LibraryStats {
  totalBooks: number;
  totalDonations: number;
  totalUsers: number;
  activeBorrows: number;
}

@Controller(Endpoint.Stats)
@ApiTags(Endpoint.Stats)
export class StatsController {
  constructor(
    private readonly borrowService: BorrowService,
    private readonly bookService: BookService,
    private readonly userService: UserService,
    private readonly notificationService: NotificationService,
    private readonly donationService: DonationService,
  ) {}

  @Get()
  //   @Roles(RoleType.ADMIN)
  //   @UseGuards(JwtGuard)
  async findCounts(): Promise<LibraryStats> {
    const borrowCnt = await this.borrowService.countDoc({ status: BorrowStatus.Borrowed });
    const bookCnt = await this.bookService.countDoc({});
    const usersCnt = await this.userService.countDoc({});
    const donationCnt = await this.donationService.countDoc({});
    const allstatus: LibraryStats = {
      totalBooks: bookCnt.body,
      totalDonations: donationCnt.body,
      totalUsers: usersCnt.body,
      activeBorrows: borrowCnt.body,
    };
    const failed = [borrowCnt, bookCnt, usersCnt, donationCnt].find((r) => !r.ok);
    if (failed) throw new HttpException(failed.errMessage, failed.code);
    return allstatus;
  }

  // returns user records (emails, names...) so it is admin only
  @Get('/donors')
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async findMany(@Query() inputQuery: FilterUser): Promise<PaginatedRes<User>> {
    // donors are users with at least one donation (was `> 1`)
    const additionalQuery = { donatedCount: { $gte: 1 } };
    const res = await this.userService.searchManyAndPaginate(
      ['email', 'firstName', 'lastName'],
      inputQuery,
      UserFilter,
      additionalQuery,
    );
    if (!res.ok) throw new HttpException(res.errMessage, 500);
    return res.body;
  }
}
