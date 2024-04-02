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
import { FeedbackService } from './feedback.service';
import { CreateFeedbackInput, FeedbackQuery, UpdateFeedbackDto } from './dto/feedback.dto';
import { pagiKeys, PaginatedRes, RoleType, UserFromToken } from '../../../common/common.types.dto';

import { FeedBack } from './entities/feedback.entity';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { errCode } from '@/common/constants/response.consts';
import { UserService } from '../../account/users';
import { Request } from 'express';
import { Endpoint } from '@/common/constants/model.consts';
import { ApiTags } from '@nestjs/swagger';

@Controller(Endpoint.Feedback)
@ApiTags(Endpoint.Feedback)
export class FeedbackController {
  constructor(
    private readonly feedbackService: FeedbackService,
    private readonly userService: UserService,
  ) {}

  @Post()
  @Roles(RoleType.USER)
  @UseGuards(JwtGuard)
  async createOne(@Req() req: Request, @Body() createDto: CreateFeedbackInput) {
    const user: UserFromToken = req['user'];
    /**
     * check if user giving feedback exists
     */
    const usr = await this.userService.findById(user._id);
    if (!usr.ok) throw new HttpException(usr.errMessage, errCode.UNAUTHORIZED);

    createDto.userId = user._id;
    createDto.fullName = `${usr.val.firstName} ${usr.val.lastName}`;

    const resp = await this.feedbackService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.val;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.USER)
  async update(@Param('id') id: string, @Body() updateDto: UpdateFeedbackDto) {
    const res = await this.feedbackService.updateById(id, updateDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id') id: string) {
    const res = await this.feedbackService.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  // == below queries dont need authentication
  @Get()
  @Roles(RoleType.ADMIN)
  async filterAndPaginate(@Query() inputQuery: FeedbackQuery): Promise<PaginatedRes<FeedBack>> {
    const res = await this.feedbackService.searchManyAndPaginate(['title'], inputQuery);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Get(':id')
  @Roles(RoleType.ADMIN)
  async findOne(@Param('id') id: string) {
    const res = await this.feedbackService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }
}
