import { Module } from '@nestjs/common';
import { UserService } from './users.service';
import { UsersController } from './users.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './entities/user.entity';
import { GuardsModule } from '../../../providers/guards/guards.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]), GuardsModule],

  controllers: [UsersController],
  providers: [UserService],
  exports: [UserService],
})
export class UsersModule {}
