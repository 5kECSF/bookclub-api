import { Endpoint } from '@/common/constants/model.names';
import { PaginatedRes } from '@/common/types/common.types.dto';
import { RoleType } from '@/common/types/enums';
import { generateRandomNum } from '@/common/util/random-functions';
import { JwtGuard } from '@/providers/guards/guard.rest';
import { Roles } from '@/providers/guards/roles.decorators';
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
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateUserDto, FilterUser, UpdateUserWithRole, UserFilter } from './entities/user.dto';
import { User } from './entities/user.entity';
import { UserService } from './users.service';

@Controller(Endpoint.Users)
@ApiTags(Endpoint.Users)
export class UsersController {
  constructor(private readonly usersService: UserService) {}

  //FIXME this function is used by admins to add other admins and also users
  @Post()
  // @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async createUser(@Body() createDto: CreateUserDto): Promise<User> {
    /**
     * this is to prevent errors, if admin wants to create active users he can update their status later
     */
    createDto.active = false;
    const resp = await this.usersService.createUser(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    return resp.body;
  }

  @Get()
  // @Roles(RoleType.ADMIN)
  // @UseGuards(JwtGuard)
  async findMany(@Query() inputQuery: FilterUser): Promise<PaginatedRes<User>> {
    const res = await this.usersService.searchManyAndPaginate(
      ['email', 'firstName', 'lastName'],
      inputQuery,
      UserFilter,
    );
    if (!res.ok) throw new HttpException(res.errMessage, 500);
    return res.body;
  }

  @Get(':id')
  // @Roles(RoleType.ADMIN)
  // @UseGuards(JwtGuard)
  async findOne(@Param('id') id: string): Promise<User> {
    const res = await this.usersService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserWithRole): Promise<User> {
    const res = await this.usersService.updateById(id, updateUserDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Delete(':id')
  // @Roles(RoleType.ADMIN)
  // @UseGuards(JwtGuard)
  async remove(@Param('id') id: string): Promise<User> {
    const res = await this.usersService.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }

  @Patch(':id')
  @Roles(RoleType.ADMIN)
  @UseGuards(JwtGuard)
  async resetPwd(@Param('id') id: string): Promise<string> {
    const res = await this.usersService.resetPwd(id, generateRandomNum(6));
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.body;
  }
}
