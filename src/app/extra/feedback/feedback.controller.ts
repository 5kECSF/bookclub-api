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
import { pickKeys } from '@/common/util/object-functions';
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

    const fullName = `${usr.body.firstName} ${usr.body.lastName}`;
    const resp = await this.feedbackService.createOne({
      title: createDto.title,
      body: createDto.body,
      email: createDto.email || usr.body.email,
      userId: user._id,
      userName: fullName,
      seen: false,
    });
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.body;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.USER)
  async update(@Req() req: Request, @Param('id') id: string, @Body() updateDto: UpdateFeedbackDto) {
    const user: UserFromToken = req['user'];
    const isAdmin = user.role === RoleType.ADMIN;
    // admins can mark feedback as seen; users can only edit the text of their own feedback
    const allowed = isAdmin ? ['title', 'body', 'email', 'seen'] : ['title', 'body', 'email'];
    const update = pickKeys(updateDto || {}, allowed);
    if (Object.keys(update).length === 0) throw new HttpException('Nothing to update', 400);
    const filter = isAdmin ? { _id: id } : { _id: id, userId: user._id };
    const res = await this.feedbackService.findOneAndUpdate(filter, update);
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
  @UseGuards(JwtGuard)
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
  @UseGuards(JwtGuard)
  async findOne(@Param('id') id: string) {
    const res = await this.feedbackService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }
}
