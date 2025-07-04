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
import { CreateNotificationInput, NotificationQuery, UpdateDto } from './entities/notification.dto';
import { NotificationService } from './notification.service';

import { Endpoint } from '@/common/constants/model.names';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { ApiTags } from '@nestjs/swagger';
import { Notification, NotificationEnum, NotificationFilter } from './entities/notification.entity';

@Controller(Endpoint.Notification)
@ApiTags(Endpoint.Notification)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async createOne(@Body() createDto: CreateNotificationInput) {
    const resp = await this.notificationService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.body;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async update(@Param('id') id: string, @Body() updateDto: UpdateDto) {
    const res = await this.notificationService.updateById(id, updateDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id') id: string) {
    const res = await this.notificationService.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Get()
  @UseGuards(JwtGuard)
  async filterAndPaginate(
    @Req() req: Request,
    @Query() inputQuery: NotificationQuery,
  ): Promise<PaginatedRes<Notification>> {
    const user: UserFromToken = req['user'];
    const additinalQuery = {
      $or: [{ type: NotificationEnum.General }, { userId: user._id }],
    };
    if (inputQuery.after) {
      additinalQuery['createdAt'] = { $gt: new Date(inputQuery.after) };
    }
    const res = await this.notificationService.searchManyAndPaginate(
      ['title'],
      inputQuery,
      NotificationFilter,
      additinalQuery,
    );
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Get(':id')
  @UseGuards(JwtGuard)
  async findOne(@Param('id') id: string) {
    const res = await this.notificationService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }
}
