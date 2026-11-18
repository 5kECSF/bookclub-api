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
import { Donation } from './entities/donation.entity';

import { Endpoint } from '@/common/constants/model.names';
import { ApiTags } from '@nestjs/swagger';

@Controller(Endpoint.Donation)
@ApiTags(Endpoint.Donation)
export class DonationController {
  constructor(private readonly donationService: DonationService) {}

  @Post()
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async createOne(@Req() req: Request, @Body() createDto: CreateDonationInput): Promise<Donation> {
    // logTrace('input', createDto, ColorEnums.BgCyan);
    const result = await this.donationService.CreateDonation(createDto);
    if (!result.ok) throw new HttpException(result.errMessage, result.code);
    return result.body;
  }

  @Patch(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async update(@Param('id') id: string, @Body() updateDonationDto: UpdateDonationDto) {
    // book instance/available counts and donor counts are recomputed
    const res = await this.donationService.UpdateDonation(id, updateDonationDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  @Roles(RoleType.ADMIN)
  async removeOne(@Param('id') id: string): Promise<Donation> {
    // refuses RESERVED/TAKEN copies (409); recomputes book & donor counts
    const res = await this.donationService.RemoveDonation(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  //=   ========  the below queries dont need authentication

  @Get()
  async filterManyAndPaginate(@Query() inputQuery: DonationQuery): Promise<PaginatedRes<Donation>> {
    const res = await this.donationService.searchManyAndPaginate(
      ['donorName', 'bookName', 'uid'],
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
