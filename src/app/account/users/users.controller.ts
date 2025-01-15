import { Endpoint } from '@/common/constants/model.names';
import { PaginatedRes } from '@/common/types/common.types.dto';
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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CreateUser, FilterUser, UpdateUserWithRole, UserFilter } from './dto/user.mut.dto';
import { User } from './entities/user.entity';
import { UserService } from './users.service';

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
    resp.body.password = '';
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
  // @Roles(RoleType.ADMIN)
  // @UseGuards(JwtGuard)
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
}
