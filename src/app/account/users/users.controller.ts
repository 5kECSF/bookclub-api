import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpException,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UserService } from './users.service';
import { CreateUser, FilterUser, UpdateUserWithRole } from './dto/user.mut.dto';
import { User } from './entities/user.entity';
import { PaginatedRes } from '@/common/common.types.dto';
import { Endpoint } from '@/common/constants/model.consts';
import { ApiTags } from '@nestjs/swagger';

// import { Roles } from '../../providers/guards/roles.decorators';
// import { RoleType } from '../../common/common.types.dto';
// import { JwtGuard } from '../../providers/guards/guard.rest';

@Controller(Endpoint.Users)
@ApiTags(Endpoint.Users)
export class UsersController {
  constructor(private readonly usersService: UserService) {}

  //FIXME this function is used by admins to add other admins and also users
  @Post()
  // @Roles(RoleType.ADMIN)
  // @UseGuards(JwtGuard)
  async createUser(@Body() createDto: CreateUser): Promise<User> {
    /**
     * this is to prevent errors, if admin wants to create active users he can update their status later
     */
    createDto.active = false;
    const resp = await this.usersService.createUser(createDto);
    if (!resp.ok) throw new HttpException(resp.errMessage, resp.code);
    resp.val.password = '';
    return resp.val;
  }

  @Get()
  // @Roles(RoleType.ADMIN)
  // @UseGuards(JwtGuard)
  async findMany(@Query() inputQuery: FilterUser): Promise<PaginatedRes<User>> {
    const res = await this.usersService.searchManyAndPaginate(
      ['email', 'firstName', 'lastName'],
      inputQuery,
    );
    if (!res.ok) throw new HttpException(res.errMessage, 500);
    return res.val;
  }

  @Get(':id')
  // @Roles(RoleType.ADMIN)
  // @UseGuards(JwtGuard)
  async findOne(@Param('id') id: string): Promise<User> {
    const res = await this.usersService.findById(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Patch(':id')
  // @Roles(RoleType.ADMIN)
  // @UseGuards(JwtGuard)
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserWithRole): Promise<User> {
    const res = await this.usersService.updateById(id, updateUserDto);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }

  @Delete(':id')
  // @Roles(RoleType.ADMIN)
  // @UseGuards(JwtGuard)
  async remove(@Param('id') id: string): Promise<User> {
    const res = await this.usersService.findByIdAndDelete(id);
    if (!res.ok) throw new HttpException(res.errMessage, res.code);
    return res.val;
  }
}
