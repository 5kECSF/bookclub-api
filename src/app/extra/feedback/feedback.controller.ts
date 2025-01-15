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
import { PaginatedRes, UserFromToken } from '../../../common/types/common.types.dto';
import {
  CreateFeedbackInput,
  FeedbackFilter,
  FeedbackQuery,
  UpdateFeedbackDto,
} from './dto/feedback.dto';
import { FeedbackService } from './feedback.service';

import { Endpoint } from '@/common/constants/model.names';
import { errCode } from '@/common/constants/response.consts';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserService } from '../../account/users';
import { FeedBack } from './entities/feedback.entity';

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
    createDto.fullName = `${usr.body.firstName} ${usr.body.lastName}`;

    const resp = await this.feedbackService.createOne(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.body;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.USER)
  async update(@Param('id') id: string, @Body() updateDto: UpdateFeedbackDto) {
    const res = await this.feedbackService.updateById(id, updateDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async remove(@Param('id') id: string) {
    const res = await this.feedbackService.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  // == below queries dont need authentication
  @Get()
  @Roles(RoleType.ADMIN)
  async filterAndPaginate(@Query() inputQuery: FeedbackQuery): Promise<PaginatedRes<FeedBack>> {
    const res = await this.feedbackService.searchManyAndPaginate(
      ['title'],
      inputQuery,
      FeedbackFilter,
    );
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Get(':id')
  @Roles(RoleType.ADMIN)
  async findOne(@Param('id') id: string) {
    const res = await this.feedbackService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }
}
