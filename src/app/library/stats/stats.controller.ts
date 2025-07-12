// import { RoleType } from '@/common/types/enums';
import { Controller, Get, HttpException, Query } from '@nestjs/common';
import { BorrowService } from './../borrow/borrow.service';

import { Endpoint } from '@/common/constants/model.names';
// import { JwtGuard } from '@/providers/guards/guard.rest';
// import { Roles } from '@/providers/guards/roles.decorators';
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
    if (!borrowCnt.ok && !bookCnt.ok && !donationCnt.ok)
      throw new HttpException(borrowCnt.errMessage, borrowCnt.code);
    return allstatus;
  }

  @Get('/donors')
  // @Roles(RoleType.ADMIN)
  // @UseGuards(JwtGuard)
  async findMany(@Query() inputQuery: FilterUser): Promise<PaginatedRes<User>> {
    const additionalQuery = { donatedCount: { $gt: 1 } };
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
